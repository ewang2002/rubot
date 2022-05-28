import { CategoryChannel, GuildChannel, TextBasedChannel } from "discord.js";
import { Bot } from "./Bot";
import { EmojiConstants } from "./constants/GeneralConstants";
import { MutableConstants } from "./constants/MutableConstants";
import { WebRegSection } from "./definitions";
import { GeneralUtilities } from "./utilities/GeneralUtilities";
import { TimeUtilities } from "./utilities/TimeUtilities";

const CACHE: { 
    [courseCode: string]: { 
        [sectionCode: string]: { 
            enrolled: number; 
            total: number; 
            waitlist: number;
            available: number;
        } 
    } 
} = {};

const ERR_COUNTER: {
    [courseCode: string]: number;
} = {};

export async function trackWebReg(): Promise<void> {
    console.log(CACHE);
    console.log(ERR_COUNTER);
    console.log();
    const category = Bot.BotInstance.client.channels.cache.get(
        Bot.BotInstance.config.channels.webregCategory
    );

    if (!category || !(category instanceof CategoryChannel)) {
        setTimeout(trackWebReg, 1000);
        return;
    }

    const seenCourseCodes = new Set<string>();
    const channelsToDelete = new Set<GuildChannel>();
    for (const [, channel] of category.children) {
        await GeneralUtilities.stopFor(1000);
        if (!channel.isText()) {
            continue;
        }

        // See if this channel is registered.
        const channelName = channel.name.toUpperCase();
        if (channelName.indexOf("-") === -1 || channelName.indexOf("-") !== channelName.lastIndexOf("-")) {
            channelsToDelete.add(channel);
            continue;
        }

        const [subj, num] = channelName.split("-");
        const courseCode = `${subj} ${num}`;
        if (seenCourseCodes.has(courseCode)) {
            await GeneralUtilities.tryExecuteAsync(async () => {
                return await channel.send(
                    "This course is already being tracked in a different channel."
                );
            });

            channelsToDelete.add(channel);
            continue;
        }

        seenCourseCodes.add(courseCode);

        const json: WebRegSection[] | { "error": string } | null = await GeneralUtilities.tryExecuteAsync(async () => {
            const d = await Bot.AxiosClient.get(
                `http://localhost:8000/course/${MutableConstants.DEFAULT_TERM}/${subj}/${num}`
            );
            return d.data;
        });

        // Usually occurs if there is a network issue.
        if (!json || "error" in json) {
            // If we've seen this course before, then don't subject the channel to deletion.
            if (courseCode in CACHE) {
                continue; 
            }

            // Otherwise, add to error counter
            if (courseCode in ERR_COUNTER) {
                ERR_COUNTER[courseCode]++;
            }
            else {
                ERR_COUNTER[courseCode] = 1;
            }

            if (ERR_COUNTER[courseCode] > 30) {
                await GeneralUtilities.tryExecuteAsync(async () => {
                    return await channel.send(
                        "This course appears to not exist in WebReg, and will be deleted shortly."
                    );
                });

                delete ERR_COUNTER[courseCode];
                channelsToDelete.add(channel);
            }

            continue;
        }

        // If we found something that isn't an error, then we can delete it from the error counter.
        delete ERR_COUNTER[courseCode];
        const roleRegex = new RegExp(subj.toLowerCase() + "[-\\s]+" + num, "i");
        const roleToPing = category.guild.roles.cache.find(x => roleRegex.test(x.name))?.toString() ?? "";

        // No sections = canceled?
        if (json.length === 0) {
            await GeneralUtilities.tryExecuteAsync(async () => {
                return await channel.send(
                    `There are no sections available for \`${courseCode}\`. This channel will be deleted shortly.`
                );
            });

            channelsToDelete.add(channel);
            continue; 
        }

        if (!(courseCode in CACHE)) {
            CACHE[courseCode] = {};
            for (const section of json) {
                CACHE[courseCode][section.section_code] = {
                    enrolled: section.enrolled_ct,
                    waitlist: section.waitlist_ct,
                    total: section.total_seats,
                    available: section.available_seats
                };
            }

            continue;
        }

        const initSections = new Set(Object.keys(CACHE[courseCode]));
        const messageToSend = [];

        for (const s of json) {
            initSections.delete(s.section_code);
            if (!(s.section_code in CACHE[courseCode])) {
                CACHE[courseCode][s.section_code] = {
                    enrolled: s.enrolled_ct,
                    waitlist: s.waitlist_ct,
                    total: s.total_seats,
                    available: s.available_seats
                };

                messageToSend.push(
                    `\`[${s.section_code}]\` ${EmojiConstants.INBOX_EMOJI} Section \`${s.section_code}\` has been`
                        + ` added with \`${s.total_seats}\` total seats.`
                );
                continue;
            }
            
            const cachedData = CACHE[courseCode][s.section_code];

            // Notify if a seat is *just* available
            if ((cachedData.available === 0 || cachedData.waitlist > 0) &&  s.available_seats > 0 && s.waitlist_ct === 0) {
                messageToSend.push(
                    roleToPing
                        ? `\`[${s.section_code}]\` ${EmojiConstants.GREEN_CHECK_EMOJI} ${roleToPing} **${s.available_seats}** seat(s) are now available.`
                        : `\`[${s.section_code}]\` ${EmojiConstants.GREEN_CHECK_EMOJI} **${s.available_seats}** seat(s) are now available.`
                );
            }

            // Number of enrolled people changed
            if (cachedData.enrolled !== s.enrolled_ct) {
                const diff = s.enrolled_ct - cachedData.enrolled;
                const e = diff > 0 ? EmojiConstants.LONG_UP_ARROW_EMOJI : EmojiConstants.LONG_DOWN_ARROW_EMOJI;
                messageToSend.push(
                    `\`[${s.section_code}]\` ${e} Change in number of **enrolled students**: \`${cachedData.enrolled}/${cachedData.total}\` →`
                        + ` \`${s.enrolled_ct}/${s.total_seats}\` (\`${diff > 0 ? "+" + diff : diff}\`)`
                );
            }

            // Number of waitlisted people changed
            if (cachedData.waitlist !== s.waitlist_ct) {
                const diff = s.waitlist_ct - cachedData.waitlist;
                const e = diff > 0 ? EmojiConstants.ARROW_HEADING_UP_EMOJI : EmojiConstants.ARROW_HEADING_DOWN_EMOJI;
                messageToSend.push(
                    `\`[${s.section_code}]\` ${e} Change in number of **waitlisted students**: \`${cachedData.waitlist}\` → \`${s.waitlist_ct}\``
                    + ` (\`${diff > 0 ? "+" + diff : diff}\`)`
                );
            }

            // Total seats changed
            if (cachedData.total !== s.total_seats) {
                const diff = s.total_seats - cachedData.total;
                const e = diff > 0 ? EmojiConstants.GREEN_SQUARE_EMOJI : EmojiConstants.RED_SQUARE_EMOJI;
                messageToSend.push(
                    `\`[${s.section_code}]\` ${e} Change in number of **total seats**: \`${cachedData.total}\` → \`${s.total_seats}\``
                    + ` (\`${diff > 0 ? "+" + diff : diff}\`)`
                );
            }

            CACHE[courseCode][s.section_code] = {
                total: s.total_seats,
                available: s.available_seats,
                waitlist: s.waitlist_ct,
                enrolled: s.enrolled_ct
            }
        }


        if (initSections.size > 0) {
            for (const section of initSections) {
                const data = CACHE[courseCode][section];
                messageToSend.push(
                    `\`[${section}]\` ${EmojiConstants.OUTBOX_EMOJI} Section \`${section}\` has been removed (initially had`
                        + ` \`${data.enrolled}\` enrolled out of ${data.total} total seats).`
                );

                delete CACHE[courseCode][section];
            }
        }

        // If there's nothing to send, then don't go any further and go back to beginning of loop.
        if (messageToSend.length === 0) {
            continue;
        }

        const res = await sendMessage(channel, courseCode, messageToSend);
        if (!res) {
            channelsToDelete.add(channel);
        }
    }

    for await (const channel of channelsToDelete) {
        await GeneralUtilities.tryExecuteAsync(async () => {
            await channel.delete();
        });
    }

    for (const key in CACHE) {
        if (!seenCourseCodes.has(key)) {
            delete CACHE[key];
        }
    }

    setTimeout(trackWebReg, 1000);
}


async function sendMessage(channel: TextBasedChannel, courseCode: string, content: string[]): Promise<boolean> {
    try {
        const time = TimeUtilities.getDateTime();
        for (const m of content) {
            await channel.send(`\`[${time}]\` \`[${courseCode}]\` ${m}`);
        }

        return true;
    }
    catch (_) {
        return false;
    }
}