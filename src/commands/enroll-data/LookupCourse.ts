import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {Bot} from "../../Bot";
import {parseCourseSubjCode} from "./helpers/Helper";
import {WebRegSection} from "../../definitions";
import {StringBuilder} from "../../utilities/StringBuilder";
import {EmojiConstants, GeneralConstants} from "../../constants/GeneralConstants";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";
import {StringUtil} from "../../utilities/StringUtilities";
import {BaseMessageComponent, Collection, MessageButton, MessageEmbed} from "discord.js";
import {AdvancedCollector} from "../../utilities/AdvancedCollector";

export class LookupCourse extends BaseCommand {
    private static readonly TERM: string = "SP22";

    public constructor() {
        super({
            cmdCode: "LOOKUP_COURSE",
            formalCommandName: "Lookup Course on WebReg",
            botCommandName: "lookup",
            description: "Looks up a course on WebReg. This will only get the course information for current active" +
                " term.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Course & Subject Code",
                    argName: "course_subj_num",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The course subject code.",
                    required: true,
                    example: ["CSE 100", "MATH100A"]
                },
                {
                    displayName: "Show All",
                    argName: "show_all",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to show more detailed data.",
                    required: false,
                    example: ["True"]
                },
                {
                    displayName: "Show Available Seats",
                    argName: "available_only",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to show available seats instead of total enrolled count.",
                    required: false,
                    example: ["True"]
                }
            ],
            guildOnly: false,
            botOwnerOnly: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const code = ctx.interaction.options.getString("course_subj_num", true);
        const showAll = ctx.interaction.options.getBoolean("show_all", false) ?? false;
        const availableOnly = ctx.interaction.options.getBoolean("available_only", false) ?? false;
        const parsedCode = parseCourseSubjCode(code);
        if (parsedCode.indexOf(" ") === -1) {
            await ctx.interaction.reply({
                content: `The course, **\`${parsedCode}\`**, (term **\`${LookupCourse.TERM}\`**) could not be found on`
                    + " WebReg. Try again.",
                ephemeral: true
            });

            return -1;
        }

        const [subj, num] = parsedCode.split(" ");
        await ctx.interaction.deferReply();
        const json: WebRegSection[] | { "error": string } | null = await GeneralUtilities.tryExecuteAsync(async () => {
            // You will need the ucsd_webreg_rs app available
            const d = await Bot.AxiosClient.get(`http://localhost:8000/course/${subj}/${num}`);
            return d.data;
        });

        if (!json || "error" in json) {
            await ctx.interaction.editReply({
                content: "An error occurred when trying to request data from WebReg. It's possible that the wrapper" +
                    " being used to interact with WebReg's API is down, or WebReg is in maintenance mode. Try again" +
                    " later."
            });

            return -1;
        }

        if (json.length === 0) {
            await ctx.interaction.editReply({
                content: `No data was found for **\`${parsedCode}\`** (Term: \`${LookupCourse.TERM}\`).`
            });

            return 0;
        }

        const getDisplayAvailability = (x: WebRegSection): number => {
            let displayAvailability: number;
            if (availableOnly) {
                displayAvailability = x.waitlist_ct > 0
                    ? 0
                    : x.available_seats;
            }
            else {
                displayAvailability = x.enrolled_ct; 
            }

            return displayAvailability;
        };

        // Text to denote what availability means
        const availText = availableOnly
            ? "Showing available seats only (e.g. 17/35 means 17 seats are available in this section."
            : "Showing total enrolled only (e.g. 17/35 means 17 students are enrolled in this section.";

        if (!showAll) {
            const embed = GeneralUtilities.generateBlankEmbed(ctx.user, "RANDOM")
                .setTitle(`WebReg Info: **${parsedCode}** (Term: ${LookupCourse.TERM})`)
                .setDescription(`Found ${json.length} section(s) of **\`${parsedCode}\`**.`)
                .setFooter({
                    text: "Data Fetched from WebReg. " + availText
                })
                .setTimestamp();

            const parsedJson = json.map(x => {
                return new StringBuilder()
                    .append(`[${x.section_id}] ${x.section_code}: `)
                    .append(
                        x.available_seats === 0 || x.waitlist_ct > 0
                            ? EmojiConstants.RED_SQUARE_EMOJI
                            : EmojiConstants.GREEN_SQUARE_EMOJI
                    )
                    .append(` ${getDisplayAvailability(x)}/${x.total_seats}`)
                    .append(` (${x.waitlist_ct} WL)`)
                    .appendLine()
                    .toString();
            });

            const fields = ArrayUtilities.arrayToStringFields(parsedJson, (_, elem) => elem, 1000);
            for (const field of fields) {
                embed.addField(GeneralConstants.ZERO_WIDTH_SPACE, StringUtil.codifyString(field));
            }

            await ctx.interaction.editReply({
                embeds: [embed]
            });

            return 0;
        }


        const map: Collection<string, WebRegSection[]> = new Collection<string, WebRegSection[]>();
        // /^\d+$/ is a regex to test if the string contains only digits.
        // Some sections have numerical section codes, e.g. instead of A01, you have 001. These sections generally
        // only have lectures (no discussion, no final).
        if (json[0].section_code.length > 0 && /^\d+$/.test(json[0].section_code[0])) {
            map.set("0", json);
        }
        else {
            for (const entry of json) {
                if (!map.has(entry.section_code[0])) {
                    map.set(entry.section_code[0], []);
                }

                map.get(entry.section_code[0])!.push(entry);
            }
        }

        const padTimeDigit = (n: number): string => n >= 10 ? "" + n : "0" + n;
        const getTimeStr = (hr: number, min: number): string => {
            const hrFixed = padTimeDigit(hr <= 12 ? hr : hr % 12);
            const minFixed = padTimeDigit(min);
            return `${hrFixed}:${minFixed} ${hr < 12 ? "AM" : "PM"}`;
        };

        // Create an embed for each page
        const embeds: MessageEmbed[] = [];
        let pageNum = 1;
        for (const [sectionFamily, entries] of map) {
            const capeUrl = `https://cape.ucsd.edu/responses/Results.aspx?courseNumber=${subj}+${num}`;
            const embed = GeneralUtilities.generateBlankEmbed(ctx.user, "RANDOM")
                .setTitle(`**${parsedCode}** Section **${sectionFamily}** (Term: ${LookupCourse.TERM})`)
                .setDescription(
                    new StringBuilder()
                        .append(`Instructor: **\`${entries[0].instructor}\`**`).appendLine()
                        .append(`Sections: **\`${entries.length}\`**`).appendLine()
                        .append(`Evaluations: Click [Here](${capeUrl})`).appendLine()
                        .append("*" + availText + "*")
                        .toString()
                )
                .setFooter({text: `Data Fetched from WebReg. Page ${pageNum++}/${map.size}.`})
                .setTimestamp();

            for (const entry of entries) {
                embed.addField(
                    // Field title
                    new StringBuilder()
                        .append(
                            entry.available_seats === 0 || entry.waitlist_ct > 0
                                ? EmojiConstants.RED_SQUARE_EMOJI
                                : EmojiConstants.GREEN_SQUARE_EMOJI
                        )
                        .append(` [${entry.section_id}] ${entry.section_code}`)
                        .append(` ${getDisplayAvailability(entry)}/${entry.total_seats}`)
                        .append(` (${entry.waitlist_ct} WL)`)
                        .toString(),
                    // Field entry
                    StringUtil.codifyString(
                        entry.meetings.map(x => {
                            let meetingDay: string;
                            if (Array.isArray(x.meeting_days)) {
                                meetingDay = x.meeting_days.join("");
                            }
                            else {
                                const [year, month, day] = x.meeting_days.split("-")
                                    .map(x => Number.parseInt(x, 10));
                                meetingDay = `${padTimeDigit(month)}/${padTimeDigit(day)}/${padTimeDigit(year)}`;
                            }

                            return new StringBuilder()
                                .append(`[${x.meeting_type}] ${meetingDay} ${getTimeStr(x.start_hr, x.start_min)}`)
                                .append(` - ${getTimeStr(x.end_hr, x.end_min)}`)
                                .append(` @ ${x.building} ${x.room}`)
                                .toString();
                        }).join("\n")
                    )
                );
            }

            embeds.push(embed);
        }

        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;
        const nextId = uniqueId + "_next";
        const stopId = uniqueId + "_stop";
        const backId = uniqueId + "_back";
        const components: BaseMessageComponent[] = [
            new MessageButton()
                .setLabel("Previous Page")
                .setCustomId(backId)
                .setEmoji(EmojiConstants.LONG_LEFT_ARROW_EMOJI)
                .setStyle("PRIMARY"),
            new MessageButton()
                .setLabel("Stop")
                .setCustomId(stopId)
                .setEmoji(EmojiConstants.STOP_SIGN_EMOJI)
                .setStyle("DANGER"),
            new MessageButton()
                .setLabel("Next Page")
                .setCustomId(nextId)
                .setEmoji(EmojiConstants.LONG_RIGHT_TRIANGLE_EMOJI)
                .setStyle("PRIMARY")
        ];

        if (embeds.length === 1) {
            components.shift();
            components.pop();
        }

        await ctx.interaction.editReply({
            embeds: [embeds[0]],
            components: AdvancedCollector.getActionRowsFromComponents(components)
        });

        const collector = ctx.channel.createMessageComponentCollector({
            filter: i => i.customId.startsWith(uniqueId) && i.user.id === ctx.user.id,
            time: 3 * 60 * 1000
        });

        // Don't exit until they're done
        await new Promise<void>(async resolve => {
            let currPage = 0;
            collector.on("collect", async i => {
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
                    components: AdvancedCollector.getActionRowsFromComponents(components)
                });
            });

            collector.on("end", async () => {
                // Possible that someone might delete the message before this triggers.
                await GeneralUtilities.tryExecuteAsync(async () => {
                    await ctx.interaction.editReply({
                        components: []
                    });
                });

                resolve();
            });
        });

        return 0;
    }
}