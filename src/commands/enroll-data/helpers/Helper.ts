import { ButtonBuilder, ButtonStyle, Collection, EmbedBuilder, embedLength } from "discord.js";
import { DataRegistry } from "../../../DataRegistry";
import { ICapeRow, Meeting, WebRegSection } from "../../../definitions";
import {
    AdvancedCollector,
    ArrayUtilities,
    GeneralUtilities,
    ScraperApiWrapper,
    ScraperResponse,
    StringBuilder,
    StringUtil,
    TimeUtilities
} from "../../../utilities";
import { ArgumentType, IArgumentInfo, ICommandContext } from "../../BaseCommand";
import { EmojiConstants, RegexConstants } from "../../../Constants";
import CAPE_DATA = DataRegistry.CAPE_DATA;
import padTimeDigit = TimeUtilities.padTimeDigit;
import getTimeStr = TimeUtilities.getTimeStr;
import WARNING_EMOJI = EmojiConstants.WARNING_EMOJI;
import * as TurndownService from "turndown";

export const TERM_ARGUMENTS: IArgumentInfo[] = [
    {
        displayName: "Term",
        argName: "term",
        type: ArgumentType.String,
        desc: `The term to check. Defaults to ${DataRegistry.DEFAULT_TERM}`,
        restrictions: {
            stringChoices: DataRegistry.CONFIG.ucsdInfo.currentWebRegTerms.map((x) => {
                return { name: x.termName, value: x.term };
            }),
        },
        required: false,
        example: ["S322"],
    },
];

export const LOOKUP_ARGUMENTS: IArgumentInfo[] = [
    ...TERM_ARGUMENTS,
    {
        displayName: "Course & Subject Code",
        argName: "course_subj_num",
        type: ArgumentType.String,
        desc: "The course subject code.",
        required: true,
        example: ["CSE 100", "MATH100A"],
    },
];

export const PLOT_ARGUMENTS: IArgumentInfo[] = [
    {
        displayName: "Term",
        argName: "term",
        type: ArgumentType.String,
        restrictions: {
            stringChoices: DataRegistry.CONFIG.ucsdInfo.githubTerms.map((x) => {
                return { name: x.termName, value: x.term };
            }),
        },
        desc: "The term to get the graph for.",
        required: false,
        example: ["SP22"],
    },
    {
        displayName: "Course & Subject Code",
        argName: "course_subj_num",
        type: ArgumentType.String,
        desc: "The course subject code.",
        required: true,
        example: ["CSE 100", "MATH100A"],
    },
    {
        displayName: "Search Type",
        argName: "search_type",
        type: ArgumentType.String,
        restrictions: {
            stringChoices: [
                { name: "Normal (1500 x 700)", value: "norm" },
                { name: "Wide (6000 x 1500)", value: "wide" },
                { name: "First/Second Pass Only (1500 x 700)", value: "fsp" },
            ],
        },
        desc: "The plot type to get. Note that some plots may not be available for some terms.",
        required: false,
        example: ["Wide"],
    },
];

/**
 * Gets the embed color based on the percent.
 * @param {number} percent The percent, as a decimal. i.e. must be in range [0, 1]
 * @returns {[number, number, number]} The RGB values for the embed color.
 */
export function getColorByPercent(percent: number): [number, number, number] {
    const percentToUse = Math.min(Math.abs(percent), 1);
    return [Math.floor(26 + 175 * percentToUse), Math.floor(201 - 175 * percentToUse), 26];
}

/**
 * Requests data from the WebReg API (from the `ucsd_webreg_api` Rust project).
 * @param {ICommandContext} ctx The command context. Note that the interaction should NOT be responded/deferred to.
 * @param {string} term The four-character term (e.g. FA22).
 * @param {string} code The course code (e.g. CSE 100).
 * @returns {Promise<WebRegSection[] | null>} The array of sections, if the input was valid and the API is
 * functioning, or `null` otherwise. Note that the interaction WILL be responded/deferred to.
 */
export async function requestFromWebRegApi(
    ctx: ICommandContext,
    term: string,
    code: string
): Promise<WebRegSection[] | null> {
    const parsedCode = parseCourseSubjCode(code);
    if (parsedCode.indexOf(" ") === -1) {
        await ctx.interaction.reply({
            content: `Your input, \`${code}\`, is improperly formatted. It should look like \`SUBJ XXX\`.`,
            ephemeral: true,
        });

        return null;
    }

    const [subj, num] = parsedCode.split(" ");
    await ctx.interaction.deferReply();
    const json: ScraperResponse<WebRegSection[]> = await ScraperApiWrapper.getInstance()
        .getCourseInfo(term, subj, num);

    if (!json || "error" in json) {
        await ctx.interaction.editReply({
            content:
                "An error occurred when trying to request data from WebReg. It's possible that the wrapper" +
                " being used to interact with WebReg's API is down, or WebReg is in maintenance mode. Try again" +
                " later.",
        });

        return null;
    }

    if (json.length === 0) {
        await ctx.interaction.editReply({
            content: `No data was found for **\`${parsedCode}\`** (Term: \`${term}\`).`,
        });

        return null;
    }

    return json;
}

export type WebRegDisplayData = {
    sections: WebRegSection[];
    courseNotes?: string;
    sectionNotes?: Record<string, string>;
};

/**
 * Displays WebReg data, allowing the user to use interactions to navigate between different pages, where each page
 * represents a section family and each page displays data about that section.
 *
 * @param {ICommandContext} ctx The command context.
 * @param {WebRegDisplayData} data The data to display.
 * @param {string} term The term for which the above sections apply for.
 * @param {string} parsedCode The parsed section code, e.g. CSE 100.
 * @param {boolean} live Whether this data was fetched from WebReg recently.
 */
export async function displayInteractiveWebregData(
    ctx: ICommandContext,
    data: WebRegDisplayData,
    term: string,
    parsedCode: string,
    live: boolean
): Promise<void> {
    const [subj, num] = parsedCode.split(" ");
    const secByFamilyMap: Collection<string, WebRegSection[]> = new Collection<string, WebRegSection[]>();
    if (data.sections[0].section_code.length > 0 && RegexConstants.ONLY_DIGITS_REGEX.test(data.sections[0].section_code[0])) {
        // Some sections have numerical section codes, e.g., instead of A01, you have 001. 
        // These sections generally only have lectures (no discussion, no final). So, we 
        // can just put all the sections into the map with key being 0 (its section family) 
        secByFamilyMap.set("0", data.sections);
    }
    else {
        // Otherwise, we can sort each section into their section families (e.g., section A,
        // section B, etc.)
        for (const entry of data.sections) {
            if (!secByFamilyMap.has(entry.section_code[0])) {
                secByFamilyMap.set(entry.section_code[0], []);
            }

            secByFamilyMap.get(entry.section_code[0])!.push(entry);
        }
    }

    // Create an embed for each page. 
    const embeds: EmbedBuilder[] = [];
    let pageNum = 1;

    // For each section family...
    for (const [sectionFamily, sections] of secByFamilyMap) {
        // Compute the total number of seats, and the total number of students enrolled.
        const numEnrolled = sections.map((x) => x.enrolled_ct).reduce((p, c) => p + c, 0);
        const total = sections.map((x) => x.total_seats).reduce((p, c) => p + c, 0);

        // Create the base embed where we'll put the remaining data in
        const embed = new EmbedBuilder()
            .setTitle(`**${parsedCode}** Section **${sectionFamily}** (Term: ${term})`)
            .setFooter({
                text:
                    (live
                        ? "Data Fetched from WebReg. "
                        : "Cached Data. ") + `Page ${pageNum++}/${secByFamilyMap.size}.`,
            })
            .setTimestamp();

        if (live) {
            // If the data is live, then we'll set the color of the embed to be based on
            // the percent of the class that is filled. The higher the percent (i.e., the 
            // "fuller" the class, the redder the color).
            embed.setColor(getColorByPercent(numEnrolled / total));
        }
        else {
            // Otherwise, use blurple as the color.
            embed.setColor("Blurple");
        }

        // Create a list of all common meetings. A common meeting is one where all sections (e.g.,
        // A01, A02, A03, ...) share the same meetings (like lectures, final exams).
        const commonMeetings: string[] = [];

        // If there are more than 1 section, then there might be potential common meetings. So, we'll
        // need to find them here.
        if (sections.length > 1) {
            // We'll create a map, where the key is a meeting (represented in string form) and the value
            // is a number representing the number of sections that have that same meeting.
            const meetingMap: { [m: string]: number } = {};

            // For each section...
            for (const section of sections) {
                // For each meeting in that section (keep in mind that a section generally has
                // e.g., a lecture, discussion, final exam, and so on)...
                for (const meeting of section.meetings) {
                    // See if that meeting has been "seen"
                    const s = meetingToString(meeting);
                    if (!meetingMap[s]) {
                        meetingMap[s] = 0;
                    }

                    meetingMap[s]++;
                }
            }

            // Now, for each meeting (in string form)...
            for (const m in meetingMap) {
                // If this is a common meeting (which we'll know if we've seen this meeting across
                // every section)...
                if (meetingMap[m] === sections.length) {
                    // Add the meeting to the list of all common meetings.
                    commonMeetings.push(m);
                    // Then remove this meeting from every section object (note that this should remove
                    // at most one meeting per operation, so we don't need to worry about this forEach loop
                    // removing 2+ meetings).
                    sections.forEach((section) => {
                        const idx = section.meetings.findIndex((x) => meetingToString(x) === m);
                        if (idx === -1) {
                            console.warn("this shouldn't be hit at all.");
                            return;
                        }

                        section.meetings.splice(idx, 1);
                    });
                }
            }
        }

        // Now that we've computed all meetings, we'll go through each section once again...
        let sectionsAdded = 0;
        for (const section of sections) {
            let fieldTitle: string;
            if (live) {
                // If this data is "live" then we'll display the enrolled count,
                // waitlist count, and so on as the title for this section
                fieldTitle = new StringBuilder()
                    .append(
                        section.available_seats === 0 || section.waitlist_ct > 0
                            ? EmojiConstants.RED_SQUARE_EMOJI
                            : EmojiConstants.GREEN_SQUARE_EMOJI
                    )
                    .append(` [${section.section_id}] ${section.section_code} -`)
                    .append(` ${section.enrolled_ct} Enrolled / ${section.total_seats} Total`)
                    .append(` (${section.waitlist_ct} WL)`)
                    .append(
                        `   ${section.is_visible ? EmojiConstants.EYE_EMOJI : EmojiConstants.GHOST_EMOJI
                        }`
                    )
                    .toString();
            }
            else {
                // Otherwise, we just need to 
                fieldTitle = `[${section.section_id}] Section ${section.section_code}`;
            }

            // We'll now map each meeting to a string so that it can be displayed in the embed's fields
            const meetings = section.meetings.map((x) => meetingToString(x)).join("\n");
            embed.addFields({ name: fieldTitle, value: StringUtil.codifyString(meetings.length > 0 ? meetings : "N/A") });

            // If we have too many fields in the embed, or the embed has too much text, we'll remove a field.
            if (embedLength(embed.data) >= 5900 || (embed.data.fields?.length ?? 0) > 25) {
                embed.data.fields?.pop();
                break;
            }

            sectionsAdded++;
        }

        // Now we'll focus on creating the title for our embed. 
        const capeUrl = `https://cape.ucsd.edu/responses/Results.aspx?courseNumber=${subj}+${num}`;
        const descSb = new StringBuilder()
            .append(`- Instructor: **\`${sections[0].all_instructors.join(" & ")}\`** ([CAPE Evaluations](${capeUrl}))`)
            .appendLine();

        if (sectionsAdded === sections.length) {
            // If we added the same exact number of sections to the field as the length of all the sections, then
            // none of the sections got cut off due to too many fields
            descSb.append(`- Sections: **\`${sections.length}\`**`).appendLine();
        }
        else {
            // Otherwise, we need to notify the user that some of the sections were not displayed.
            descSb
                .append(
                    `- Sections: **\`${sections.length}\`** (${WARNING_EMOJI} Only **\`${sectionsAdded}\`** Displayed)`
                )
                .appendLine();
        }

        // If there are any course notes, we'll also include this.
        if (data.courseNotes) {
            // Note that the turndown method is used to convert any HTML to Markdown (which Discord can display)
            descSb.append("- Course Note: ").append(new TurndownService().turndown(data.courseNotes)).appendLine();
        }

        // If there are any common meetings, then we'll show that
        if (commonMeetings.length > 0) {
            descSb
                .append("__Common Meetings (All Sections)__")
                .append(StringUtil.codifyString(commonMeetings.join("\n")))
                .appendLine();
        }

        // Finally, we'll show the section notes, if any.
        if (data.sectionNotes && sectionFamily in data.sectionNotes) {
            descSb.append(`- Section ${sectionFamily} Note: `).append(new TurndownService().turndown(data.sectionNotes[sectionFamily]))
                .appendLine();
        }

        embed.setDescription(descSb.toString());
        embeds.push(embed);
    }

    await manageMultipageEmbed(ctx, embeds);
}

/**
 * Given a meeting object, returns a string representation of it.
 * @param {Meeting} x The meeting object.
 * @returns {string} The string representation of it.
 */
function meetingToString(x: Meeting): string {
    let meetingDay: string;
    if (Array.isArray(x.meeting_days)) {
        meetingDay = x.meeting_days.join("");
    }
    else if (x.meeting_days === null) {
        meetingDay = "N/A";
    }
    else {
        const [year, month, day] = x.meeting_days.split("-").map((x) => Number.parseInt(x, 10));
        meetingDay = `${padTimeDigit(month)}/${padTimeDigit(day)}/${padTimeDigit(year)}`;
    }

    return new StringBuilder()
        .append(`[${x.meeting_type}] ${meetingDay} ${getTimeStr(x.start_hr, x.start_min)}`)
        .append(` - ${getTimeStr(x.end_hr, x.end_min)}`)
        .appendLine()
        .append(`     ${x.building || "N/A"} ${x.room || "N/A"}`)
        .toString();
}

/**
 * Displays multiple embeds by using interactions to "turn the page."
 * @param {ICommandContext} ctx The command context.
 * @param {EmbedBuilder[]} embeds The embeds.
 */
export async function manageMultipageEmbed(
    ctx: ICommandContext,
    embeds: EmbedBuilder[]
): Promise<void> {
    const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;
    const nextId = uniqueId + "_next";
    const stopId = uniqueId + "_stop";
    const backId = uniqueId + "_back";
    const components: ButtonBuilder[] = [
        new ButtonBuilder()
            .setLabel("Previous Page")
            .setCustomId(backId)
            .setEmoji(EmojiConstants.LONG_LEFT_ARROW_EMOJI)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setLabel("Stop")
            .setCustomId(stopId)
            .setEmoji(EmojiConstants.STOP_SIGN_EMOJI)
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setLabel("Next Page")
            .setCustomId(nextId)
            .setEmoji(EmojiConstants.LONG_RIGHT_TRIANGLE_EMOJI)
            .setStyle(ButtonStyle.Primary),
    ];

    if (embeds.length === 1) {
        components.shift();
        components.pop();
    }

    await ctx.interaction.editReply({
        embeds: [embeds[0]],
        components:
            embeds.length === 1 ? [] : AdvancedCollector.getActionRowsFromComponents(components),
    });

    if (embeds.length === 1) {
        return;
    }

    const collector = ctx.channel.createMessageComponentCollector({
        filter: (i) => i.customId.startsWith(uniqueId) && i.user.id === ctx.user.id,
        time: 3 * 60 * 1000,
    });

    // Don't exit until they're done
    await new Promise<void>(async (resolve) => {
        let currPage = 0;
        collector.on("collect", async (i) => {
            await i.deferUpdate();

            switch (i.customId) {
                case nextId: {
                    currPage++;
                    currPage %= embeds.length;
                    break;
                }
                case backId: {
                    currPage--;
                    currPage = (currPage + embeds.length) % embeds.length;
                    break;
                }
                case stopId: {
                    collector.stop("stopped");
                    return;
                }
            }

            await ctx.interaction.editReply({
                embeds: [embeds[currPage]],
                components: AdvancedCollector.getActionRowsFromComponents(components),
            });
        });

        collector.on("end", async () => {
            // Possible that someone might delete the message before this triggers.
            await GeneralUtilities.tryExecuteAsync(async () => {
                await ctx.interaction.editReply({
                    components: [],
                });
            });

            resolve();
        });
    });
}

/**
 * Parses the course subject code from a given string.
 * @param {string} code The raw course subject code.
 * @returns {string} The parsed course subject code.
 */
export function parseCourseSubjCode(code: string): string {
    let s = "";
    let i = 0;
    for (; i < code.length; i++) {
        // Regex to see if it's a number
        if (RegexConstants.ONLY_DIGITS_REGEX.test(code[i])) {
            break;
        }

        if (code[i] === " ") {
            continue;
        }

        s += code[i];
    }

    s += " ";

    for (; i < code.length; i++) {
        s += code[i];
    }

    return s.toUpperCase().trim();
}

/**
 * Gets the CAPE summary as an embed.
 * @param {object} args The arguments.
 * @returns {[EmbedBuilder | null, number]} A tuple where the first element is the message embed, if any, and the
 * second element is the number of entries found.
 */
export function getCapeSummary(args: {
    instructor?: string | null;
    courseNumber?: string | null;
    showSummary: boolean;
}): [EmbedBuilder | null, number] {
    if (!args.instructor && !args.courseNumber) {
        return [null, -1];
    }

    let res: ICapeRow[] = CAPE_DATA;
    if (args.instructor) {
        res = res.filter((x) => x.instructor.toLowerCase() === args.instructor!.toLowerCase());
    }

    if (args.courseNumber) {
        res = res.filter((x) => x.subjectCourse.toLowerCase() === args.courseNumber!.toLowerCase());
    }

    if (res.length === CAPE_DATA.length || res.length === 0) {
        return [null, res.length === CAPE_DATA.length ? CAPE_DATA.length : 0];
    }

    const embed = new EmbedBuilder().setColor("Random").setFooter({ text: "Data from CAPE." });

    const processEmbed = (target: string, type: "instructor" | "course" | "all"): void => {
        const map: Collection<string, ICapeRow[]> = new Collection<string, ICapeRow[]>();
        for (const row of res) {
            if (!map.has(target)) {
                map.set(target, []);
            }

            const arr = map.get(target)!;
            arr.push(row);
        }

        for (const [instructor, capeRows] of map) {
            const fields = ArrayUtilities.arrayToStringFields(capeRows, (_, elem) => {
                const expectedGrade = elem.averageGradeExp === -1 ? "N/A" : elem.averageGradeExp;
                const actualGrade = elem.averageGradeRec === -1 ? "N/A" : elem.averageGradeRec;

                const b = new StringBuilder().append(`[${elem.term}] `);

                if (type === "all") {
                    b.append(
                        `${elem.evaluationsMade}/${elem.enrollmentCount} Evaluations`
                    ).appendLine();
                }
                else {
                    b.append(type === "instructor" ? elem.subjectCourse : elem.instructor)
                        .append(` (${elem.evaluationsMade}/${elem.enrollmentCount} Evaluations)`)
                        .appendLine();
                }

                b.append(`- Rcmnd. Instructor  : ${elem.recommendedInstructor}%`)
                    .appendLine()
                    .append(`- Rcmnd. Class       : ${elem.recommendedClass}%`)
                    .appendLine()
                    .append(`- Study Hours/Week   : ${elem.studyHourWeek}`)
                    .appendLine()
                    .append(`- Avg. Grade Expected: ${expectedGrade}`)
                    .appendLine()
                    .append(`- Avg. Grade Received: ${actualGrade}`)
                    .appendLine(2);

                return b.toString();
            });

            let i = 0;
            for (; i < fields.length && (embed.data.fields?.length ?? 0) <= 25; i++) {
                if (embedLength(embed.data) + fields[i].length >= 5900) {
                    embed.setFooter({ text: "Data from CAPE. Some results have been omitted." });
                    return;
                }
                embed.addFields({ name: instructor, value: StringUtil.codifyString(fields[i]) });
            }
        }
    };

    // If only instructor, show limited stats
    if (args.instructor && !args.courseNumber) {
        embed
            .setTitle(`Instructor Review: **${args.instructor}**`)
            .setDescription(`CAPE summary is based on ${res.length} entries.`);
        processEmbed(args.instructor, "instructor");
        return [embed, res.length];
    }

    // If only course number, show limited stats
    if (args.courseNumber && !args.instructor) {
        embed
            .setTitle(`Course Review: **${args.courseNumber}**`)
            .setDescription(`CAPE summary is based on ${res.length} entries.`);
        processEmbed(args.courseNumber, "course");
        return [embed, res.length];
    }

    // Otherwise, we can show more stats
    if (args.showSummary) {
        let recommendClass = 0;
        let recommendInstructor = 0;
        let studyHrsWk = 0;
        let evalsMade = 0;
        let totalEnroll = 0;

        const averageGradeExpected = [0, 0];
        const averageGradeReceived = [0, 0];
        for (const row of res) {
            recommendClass += row.recommendedClass * row.evaluationsMade;
            recommendInstructor += row.recommendedInstructor * row.evaluationsMade;
            studyHrsWk += row.studyHourWeek * row.evaluationsMade;
            evalsMade += row.evaluationsMade;
            totalEnroll += row.enrollmentCount;

            if (row.averageGradeExp !== -1) {
                averageGradeExpected[0] += row.averageGradeExp * row.evaluationsMade;
                averageGradeExpected[1] += row.evaluationsMade;
            }

            if (row.averageGradeRec !== -1) {
                averageGradeReceived[0] += row.averageGradeRec * row.evaluationsMade;
                averageGradeReceived[1] += row.evaluationsMade;
            }
        }

        recommendClass /= evalsMade;
        recommendInstructor /= evalsMade;
        studyHrsWk /= evalsMade;
        const avgGradeExp =
            averageGradeExpected[1] === 0 ? 0 : averageGradeExpected[0] / averageGradeExpected[1];
        const avgGradeRec =
            averageGradeReceived[1] === 0 ? 0 : averageGradeReceived[0] / averageGradeReceived[1];

        embed
            .setTitle(`CAPE Summary for: **${args.instructor}** (Course **${args.courseNumber}**)`)
            .setDescription(
                `A total of **\`${evalsMade}\`** evaluations have been made, out of **\`${totalEnroll}\`**` +
                ` students enrolled in across **\`${res.length}\`** sections.`
            )
            .addFields({
                name: "Recommend Instructor",
                value: StringUtil.codifyString(`${Math.round(recommendInstructor * 100) / 100}%`),
                inline: true
            })
            .addFields({
                name: "Recommend Course",
                value: StringUtil.codifyString(`${Math.round((recommendClass * 100) / 100)}%`),
                inline: true
            })
            .addFields({
                name: "Study Hours/Week",
                value: StringUtil.codifyString(Math.round(studyHrsWk * 100) / 100)
            })
            .addFields({
                name: "Average Grade Expected",
                value: StringUtil.codifyString(Math.round(avgGradeExp * 100) / 100),
                inline: true
            })
            .addFields({
                name: "Average Grade Received",
                value: StringUtil.codifyString(Math.round(avgGradeRec * 100) / 100),
                inline: true
            });

        return [embed, res.length];
    }

    embed
        .setTitle(`CAPE Summary for: **${args.instructor}** (Course **${args.courseNumber}**)`)
        .setDescription(`CAPE summary is based on ${res.length} entries.`);
    processEmbed(args.instructor!, "all");
    return [embed, res.length];
}
