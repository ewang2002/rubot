import { EmbedBuilder, embedLength } from "discord.js";
import { GeneralConstants } from "../../Constants";
import { DataRegistry } from "../../DataRegistry";
import { ISearchQuery, IWebRegSearchResult } from "../../definitions";
import { ArrayUtilities, GeneralUtilities, ScraperApiWrapper, ScraperResponse, StringBuilder, StringUtil, TimeUtilities } from "../../utilities";
import BaseCommand, { ArgumentType, ICommandContext } from "../BaseCommand";
import { TERM_ARGUMENTS } from "./helpers/Helper";
import * as table from "text-table";

export default class SearchCourse extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "SEARCH_COURSE",
            formalCommandName: "Search Course(s) on WebReg",
            botCommandName: "searchcourse",
            description:
                "Searches for one or more courses, returning a list of courses that might meet the criteria.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: TERM_ARGUMENTS.concat([
                {
                    displayName: "Subjects",
                    argName: "subjects",
                    type: ArgumentType.String,
                    desc: "The subjects to check, separated by a comma.",
                    required: false,
                    example: ["CSE", "CSE, COGS, MATH"],
                },
                {
                    displayName: "Courses",
                    argName: "courses",
                    type: ArgumentType.String,
                    desc: "The courses to check, separated by a comma",
                    required: false,
                    example: ["CSE 101", "CSE, MATH, CSE 95, 108"],
                },
                {
                    displayName: "Departments",
                    argName: "departments",
                    type: ArgumentType.String,
                    desc: "The departments to check, separated by a comma",
                    required: false,
                    example: ["CSE", "CSE, MATH", "COGS"],
                },
                {
                    displayName: "Instructor",
                    argName: "instructor",
                    type: ArgumentType.String,
                    desc: "The instructor to look for. Should be in form \"Last, First\"",
                    required: false,
                    example: ["Kane", "Kedlaya", "Daniel", "Kane, Daniel"],
                },
                {
                    displayName: "Title",
                    argName: "title",
                    type: ArgumentType.String,
                    desc: "The name of the course",
                    required: false,
                    example: ["Differential", "Data Sci"],
                },
                {
                    displayName: "Only Show Open Courses",
                    argName: "only_show_open",
                    type: ArgumentType.Boolean,
                    desc: "Whether to only show open courses. Defaults to false.",
                    required: false,
                    example: ["false", "true"],
                },
                {
                    displayName: "Show Lower-Division Courses",
                    argName: "show_lower",
                    type: ArgumentType.Boolean,
                    desc: "Whether to show lower-division courses. Defaults to true.",
                    required: false,
                    example: ["false", "true"],
                },
                {
                    displayName: "Show Upper-Division Courses",
                    argName: "show_upper",
                    type: ArgumentType.Boolean,
                    desc: "Whether to show upper-division courses. Defaults to true.",
                    required: false,
                    example: ["false", "true"],
                },
                {
                    displayName: "Show Graduate-Division Courses",
                    argName: "show_graduate",
                    type: ArgumentType.Boolean,
                    desc: "Whether to show graduate-division courses. Defaults to true.",
                    required: false,
                    example: ["false", "true"],
                },
                {
                    displayName: "Start Time",
                    argName: "start_time",
                    type: ArgumentType.String,
                    desc: "The start time. This must be formatted using HH:MM AM/PM (e.g., 06:30 AM).",
                    required: false,
                    example: ["02:30 PM", "05:40 AM"],
                },
                {
                    displayName: "End Time",
                    argName: "end_time",
                    type: ArgumentType.String,
                    desc: "The end time. This must be formatted using HH:MM AM/PM (e.g., 06:30 AM).",
                    required: false,
                    example: ["02:30 PM", "05:40 AM"],
                },
                {
                    displayName: "Show Title",
                    argName: "showtitle",
                    type: ArgumentType.Boolean,
                    desc: "Whether to show course titles. Defaults to true.",
                    required: false,
                    example: ["false", "true"],
                },
            ]),
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const term =
            ctx.interaction.options.getString("term", false) ?? DataRegistry.DEFAULT_TERM;
        const subjects =
            ctx.interaction.options
                .getString("subjects", false)
                ?.toUpperCase()
                .split(",")
                .map((x) => x.trim())
                .filter((x) => x.length > 0) ?? [];
        const courses =
            ctx.interaction.options
                .getString("courses", false)
                ?.toUpperCase()
                .split(",")
                .map((x) => x.trim())
                .filter((x) => x.length > 0) ?? [];
        const departments =
            ctx.interaction.options
                .getString("departments", false)
                ?.toUpperCase()
                .split(",")
                .map((x) => x.trim())
                .filter((x) => x.length > 0) ?? [];
        const instructor = ctx.interaction.options.getString("instructor", false) ?? null;
        const title = ctx.interaction.options.getString("title", false) ?? null;
        const onlyShowOpen = ctx.interaction.options.getBoolean("only_show_open", false) ?? false;
        const showTitles = ctx.interaction.options.getBoolean("showtitle", false) ?? true;
        const showLower = ctx.interaction.options.getBoolean("show_lower", false) ?? true;
        const showUpper = ctx.interaction.options.getBoolean("show_upper", false) ?? true;
        const showGrad = ctx.interaction.options.getBoolean("show_graduate", false) ?? true;

        const timeParser = (rawTime: string): [number, number] | null => {
            if (
                !rawTime.includes(":") ||
                (!rawTime.toLowerCase().includes("am") && !rawTime.toLowerCase().includes("pm"))
            ) {
                return null;
            }

            const [hr, min, ...rest] = rawTime.split(":").map((x) => x.trim());
            if (rest.length > 0) {
                return null;
            }

            const parsedHr = Number.parseInt(hr);
            if (Number.isNaN(parsedHr) || parsedHr < 1 || parsedHr > 12) {
                return null;
            }

            // For minute, only include the actual numerical values
            let parsedMin = 0;
            let i = 0;
            while (i < min.length) {
                const n = Number.parseInt(min[i]);
                if (Number.isNaN(n)) {
                    break;
                }

                parsedMin = parsedMin * 10 + n;
                i++;
            }

            if (parsedMin < 0 || parsedMin > 59) {
                return null;
            }

            const amOrPm = min.substring(i).trim().toLowerCase();
            let isAm: boolean;
            if (amOrPm === "am") {
                isAm = true;
            }
            else if (amOrPm === "pm") {
                isAm = false;
            }
            else {
                // must not be valid
                return null;
            }

            let hrToReturn = 0;
            if (isAm) {
                hrToReturn = parsedHr === 12 ? 0 : parsedHr;
            }
            else {
                hrToReturn = parsedHr === 12 ? 12 : parsedHr + 12;
            }

            return [hrToReturn, parsedMin];
        };

        const startTime = timeParser(ctx.interaction.options.getString("start_time", false) ?? "");
        const endTime = timeParser(ctx.interaction.options.getString("end_time", false) ?? "");

        await ctx.interaction.deferReply();

        const data: ISearchQuery = {
            subjects,
            courses,
            departments,
            only_allow_open: onlyShowOpen,
            show_grad_div: showGrad,
            show_lower_div: showLower,
            show_upper_div: showUpper,
        };

        if (title) {
            data.title = title;
        }

        if (instructor) {
            data.instructor = instructor;
        }

        if (startTime) {
            const [h, m] = startTime;
            data.start_min = m;
            data.start_hr = h;
        }

        if (endTime) {
            const [h, m] = endTime;
            data.end_min = m;
            data.end_hr = h;
        }

        // Create a string representing what was searched so the user knows what to expect.
        const searchQuery = new StringBuilder("__**Your Search Query**__")
            .appendLine()
            .append(`- \`Subjects      :\` **\`[${data.subjects.join(", ")}]\`**`)
            .appendLine()
            .append(`- \`Courses       :\` **\`[${data.courses.join(", ")}]\`**`)
            .appendLine()
            .append(`- \`Departments   :\` **\`[${data.departments.join(", ")}]\`**`)
            .appendLine()
            .append(`- \`Only Show Open:\` **\`${data.only_allow_open ? "Yes" : "No"}\`**`)
            .appendLine()
            .append(`- \`Show Grad Only:\` **\`${data.show_grad_div ? "Yes" : "No"}\`**`)
            .appendLine()
            .append(`- \`Show UD Only  :\` **\`${data.show_upper_div ? "Yes" : "No"}\`**`)
            .appendLine()
            .append(`- \`Show LD Only  :\` **\`${data.show_lower_div ? "Yes" : "No"}\`**`)
            .appendLine();

        if (title) {
            searchQuery.append(`- \`Title         :\` **\`${data.title}\`**`).appendLine();
        }

        if (instructor) {
            searchQuery.append(`- \`Instructor    :\` **\`${data.instructor}\`**`).appendLine();
        }

        if (startTime) {
            searchQuery
                .append(
                    `- \`Start Time    :\` **\`${startTime
                        .map((x) => TimeUtilities.padTimeDigit(x))
                        .join(":")}\`**`
                )
                .appendLine();
        }

        if (endTime) {
            searchQuery
                .append(
                    `- \`End Time      :\` **\`${endTime
                        .map((x) => TimeUtilities.padTimeDigit(x))
                        .join(":")}\`**`
                )
                .appendLine();
        }

        const json: ScraperResponse<IWebRegSearchResult[]> = await ScraperApiWrapper.getInstance()
            .searchCourse(term, data);

        if (!json || "error" in json) {
            await ctx.interaction.editReply({
                content:
                    "An error occurred when trying to request data from WebReg. It's possible that the wrapper" +
                    " being used to interact with WebReg's API is down, or WebReg is in maintenance mode. Try again" +
                    " later.",
            });

            return -1;
        }

        if (json.length === 0) {
            await ctx.interaction.editReply({
                content: "No results found. Try again.",
            });

            return 0;
        }

        const finalEmbed = new EmbedBuilder().setColor("Random");
        finalEmbed.setTitle(`Search Results: **${term}**`);
        let footerText = `${json.length} results found.`;

        if (showTitles) {
            const allData = table(
                json.map((w) => [
                    `${w.SUBJ_CODE.trim()} ${w.CRSE_CODE.trim()}`,
                    w.CRSE_TITLE.trim(),
                ])
            ).split("\n");

            const desc = new StringBuilder();
            let i = 0;
            for (; i < allData.length; i++) {
                if (desc.length() + allData[i].length + 5 >= 4000) {
                    break;
                }

                desc.append(allData[i]).appendLine();
            }

            const remaining = allData.filter((_, idx) => idx >= i);
            const fields = ArrayUtilities.arrayToStringFields(remaining, (_, elem) => elem + "\n");

            finalEmbed.setDescription(StringUtil.codifyString(desc.toString()));
            let addedAll = true;
            for (const field of fields) {
                if ((finalEmbed.data.fields?.length ?? 0) + 1 >= 25) {
                    addedAll = false;
                    break;
                }

                finalEmbed.addFields({
                    name: GeneralConstants.ZERO_WIDTH_SPACE,
                    value: StringUtil.codifyString(field)
                });

                if (embedLength(finalEmbed.data) + 25 >= 5950) {
                    finalEmbed.data.fields?.pop();
                    addedAll = false;
                    break;
                }
            }

            if (!addedAll) {
                footerText += " Some fields were omitted.";
            }
        }
        else {
            const fields = ArrayUtilities.arrayToStringFields(
                json.map((x) => `${x.SUBJ_CODE.trim()} ${x.CRSE_CODE.trim()}, `),
                (_, elem) => elem
            );

            let addedAll = true;
            for (const field of fields) {
                finalEmbed.addFields({
                    name: GeneralConstants.ZERO_WIDTH_SPACE,
                    value: field.substring(0, field.length - 2)
                });

                if (embedLength(finalEmbed.data) + 50 >= 5950) {
                    finalEmbed.data.fields?.pop();
                    addedAll = false;
                    break;
                }
            }

            if (!addedAll) {
                footerText += " Some courses were omitted.";
            }
        }

        finalEmbed.setFooter({
            text: footerText,
        });

        await ctx.interaction.editReply({
            content: searchQuery.toString(),
            embeds: [finalEmbed],
        });

        return 0;
    }
}
