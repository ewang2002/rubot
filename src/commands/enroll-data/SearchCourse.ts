import { MessageEmbed } from "discord.js";
import { Bot } from "../../Bot";
import { GeneralConstants } from "../../constants/GeneralConstants";
import { MutableConstants } from "../../constants/MutableConstants";
import { IWebRegSearchResult } from "../../definitions";
import { ArrayUtilities } from "../../utilities/ArrayUtilities";
import { GeneralUtilities } from "../../utilities/GeneralUtilities";
import { StringBuilder } from "../../utilities/StringBuilder";
import { ArgumentType, BaseCommand, ICommandContext } from "../BaseCommand";
import { TERM_ARGUMENTS } from "./helpers/Helper";
import * as table from "text-table";
import { StringUtil } from "../../utilities/StringUtilities";

export class SearchCourse extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "SEARCH_COURSE",
            formalCommandName: "Search Course(s) on WebReg",
            botCommandName: "searchcourse",
            description: "Searches for one or more courses, returning a list of courses that might meet the criteria.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: TERM_ARGUMENTS.concat([
                {
                    displayName: "Subjects",
                    argName: "subjects",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The subjects to check, separated by a comma.",
                    required: false,
                    example: ["CSE", "CSE, COGS, MATH"]
                },
                {
                    displayName: "Courses",
                    argName: "courses",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The courses to check, separated by a comma",
                    required: false,
                    example: ["CSE 101", "CSE, MATH, CSE 95, 108"]
                },
                {
                    displayName: "Departments",
                    argName: "departments",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The departments to check, separated by a comma",
                    required: false,
                    example: ["CSE", "CSE, MATH", "COGS"]
                },
                {
                    displayName: "Instructor",
                    argName: "instructor",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The instructor to look for. Should be in form \"Last, First\"",
                    required: false,
                    example: ["Kane", "Kedlaya", "Daniel", "Kane, Daniel"]
                },
                {
                    displayName: "Title",
                    argName: "title",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The name of the course",
                    required: false,
                    example: ["Differential", "Data Sci"]
                },
                {
                    displayName: "Only Show Open Courses",
                    argName: "only_show_open",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to only show open courses. Defaults to false.",
                    required: false,
                    example: ["false", "true"]
                },
                {
                    displayName: "Show Title",
                    argName: "showtitle",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to show course titles. Defaults to true.",
                    required: false,
                    example: ["false", "true"]
                },
                {
                    displayName: "Show Lower-Division Courses",
                    argName: "show_lower",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to show lower-division courses. Defaults to true.",
                    required: false,
                    example: ["false", "true"]
                },
                {
                    displayName: "Show Upper-Division Courses",
                    argName: "show_upper",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to show upper-division courses. Defaults to true.",
                    required: false,
                    example: ["false", "true"]
                },
                {
                    displayName: "Show Graduate-Division Courses",
                    argName: "show_graduate",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to show graduate-division courses. Defaults to true.",
                    required: false,
                    example: ["false", "true"]
                }
            ]),
            guildOnly: false,
            botOwnerOnly: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const term = ctx.interaction.options.getString("term", false) ?? MutableConstants.DEFAULT_TERM;
        const subjects = ctx.interaction.options.getString(
            "subjects",
            false
        )?.toUpperCase().split(",").map(x => x.trim()).filter(x => x.length > 0) ?? [];
        const courses = ctx.interaction.options.getString(
            "courses",
            false
        )?.toUpperCase().split(",").map(x => x.trim()).filter(x => x.length > 0) ?? [];
        const departments = ctx.interaction.options.getString(
            "departments",
            false
        )?.toUpperCase().split(",").map(x => x.trim()).filter(x => x.length > 0) ?? [];
        const instructor = ctx.interaction.options.getString("instructor", false) ?? null;
        const title = ctx.interaction.options.getString("title", false) ?? null;
        const onlyShowOpen = ctx.interaction.options.getBoolean("only_show_open", false) ?? false;
        const showTitles = ctx.interaction.options.getBoolean("showtitle", false) ?? true;
        const showLower = ctx.interaction.options.getBoolean("show_lower", false) ?? true;
        const showUpper = ctx.interaction.options.getBoolean("show_upper", false) ?? true;
        const showGrad = ctx.interaction.options.getBoolean("show_graduate", false) ?? true;

        await ctx.interaction.deferReply();

        const data: SearchQuery = {
            subjects,
            courses,
            departments,
            only_allow_open: onlyShowOpen,
            show_grad_div: showGrad,
            show_lower_div: showLower,
            show_upper_div: showUpper
        };

        if (title) {
            data["title"] = title;
        }

        if (instructor) {
            data["instructor"] = instructor;
        }

        const json: IWebRegSearchResult[] | { "error": string } | null = await GeneralUtilities.tryExecuteAsync(async () => {
            // You will need the ucsd_webreg_rs app available
            const d = await Bot.AxiosClient.post(`http://127.0.0.1:3000/webreg/search_courses/${term}`, data);
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
                content: "No results found. Try again."
            });

            return 0;
        }

        const finalEmbed = new MessageEmbed({ color: "RANDOM" });
        finalEmbed.setTitle(`Search Results: **${term}**`);
        let footerText = `${json.length} results found.`;

        if (showTitles) {
            const allData = table(
                json.map(w => [`${w.SUBJ_CODE.trim()} ${w.CRSE_CODE.trim()}`, w.CRSE_TITLE.trim()])
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
                if (finalEmbed.fields.length + 1 >= 25) {
                    addedAll = false;
                    break;
                }

                finalEmbed.addField(GeneralConstants.ZERO_WIDTH_SPACE, StringUtil.codifyString(field));

                if (finalEmbed.length + 25 >= 5950) {
                    finalEmbed.fields.pop();
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
                json.map(x => `${x.SUBJ_CODE.trim()} ${x.CRSE_CODE.trim()}, `),
                (_, elem) => elem
            );

            let addedAll = true;
            for (const field of fields) {
                finalEmbed.addField(GeneralConstants.ZERO_WIDTH_SPACE, field.substring(0, field.length - 2));

                if (finalEmbed.length + 50 >= 5950) {
                    finalEmbed.fields.pop();
                    addedAll = false;
                    break;
                }
            }

            if (!addedAll) {
                footerText += " Some courses were omitted.";
            }
        }

        finalEmbed.setFooter({
            text: footerText
        });
        
        await ctx.interaction.editReply({
            embeds: [finalEmbed]
        });

        return 0;
    }
}

interface SearchQuery {
    subjects: string[];
    courses: string[];
    departments: string[];
    instructor?: string;
    title?: string;
    only_allow_open: boolean;
    show_lower_div: boolean,
    show_upper_div: boolean,
    show_grad_div: boolean,
}