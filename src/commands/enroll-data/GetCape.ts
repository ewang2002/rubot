import { ArgumentType, BaseCommand, ICommandContext } from "../BaseCommand";
import { EmojiConstants } from "../../constants/GeneralConstants";
import { ArrayUtilities } from "../../utilities/ArrayUtilities";
import { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { AdvancedCollector } from "../../utilities/AdvancedCollector";
import { MutableConstants } from "../../constants/MutableConstants";
import CAPE_DATA = MutableConstants.CAPE_DATA;
import { getCapeSummary, parseCourseSubjCode } from "./helpers/Helper";

export class GetCape extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "GET_CAPE",
            formalCommandName: "Lookup CAPE",
            botCommandName: "getcape",
            description: "Looks up CAPE information for a course and/or instructor.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Course Number",
                    argName: "course_number",
                    type: ArgumentType.String,
                    desc: "The course subject code.",
                    required: false,
                    example: ["CSE100", "100A"],
                },
                {
                    displayName: "Instructor",
                    argName: "instructor",
                    type: ArgumentType.String,
                    desc: "The instructor's name (Format: Last, First).",
                    required: false,
                    example: ["Kane, Daniel Mertz.", "Kedlaya"],
                },
                {
                    displayName: "Show Raw",
                    argName: "show_raw",
                    type: ArgumentType.Boolean,
                    desc: "Whether to show raw data.",
                    required: false,
                    example: ["True"],
                },
            ],
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const courseNumber = ctx.interaction.options.getString("course_number", false);
        const instructor = ctx.interaction.options.getString("instructor", false);
        const showAll = ctx.interaction.options.getBoolean("show_raw", false) ?? false;
        await ctx.interaction.deferReply();

        let courseToSearch: string | null = null;
        if (courseNumber) {
            const parsedCode = parseCourseSubjCode(courseNumber);
            const allCoursesInCapes = ArrayUtilities.removeDuplicates(
                CAPE_DATA.map((x) => x.subjectCourse).filter((x) =>
                    x.toLowerCase().includes(parsedCode.toLowerCase())
                )
            );

            if (allCoursesInCapes.length > 20) {
                await ctx.interaction.editReply({
                    content:
                        `Your search query, **\`${courseNumber}\`**, has too many results. Please narrow your` +
                        " query and try again.",
                });

                return -1;
            }

            if (allCoursesInCapes.length > 1) {
                const uIdentifier = Date.now() + "" + Math.random() + ctx.user.id;
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(uIdentifier + "_select")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Select a Course")
                    .addOptions(
                        allCoursesInCapes.map((x) => {
                            return {
                                label: x,
                                value: x,
                            };
                        })
                    );

                await ctx.interaction.editReply({
                    content:
                        "Please select the course that you want to specifically search. If you want to cancel" +
                        " this, press the Cancel button.",
                    components: AdvancedCollector.getActionRowsFromComponents([
                        selectMenu,
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(EmojiConstants.X_EMOJI)
                            .setLabel("Cancel")
                            .setCustomId(uIdentifier),
                    ]),
                });

                const selected = await AdvancedCollector.startInteractionEphemeralCollector(
                    {
                        targetAuthor: ctx.user,
                        acknowledgeImmediately: true,
                        targetChannel: ctx.channel,
                        duration: 30 * 1000,
                    },
                    uIdentifier
                );

                if (!selected || !selected.isStringSelectMenu()) {
                    await ctx.interaction.editReply({
                        content: "You either canceled this process or the process timed out.",
                        components: [],
                    });

                    return -1;
                }

                courseToSearch = selected.values[0];
            } else {
                courseToSearch = allCoursesInCapes[0];
            }
        }

        let instructorToSearch: string | null = null;
        if (instructor) {
            const allInstructors = ArrayUtilities.removeDuplicates(
                CAPE_DATA.map((x) => x.instructor).filter((x) =>
                    x.toLowerCase().includes(instructor.toLowerCase())
                )
            );

            if (allInstructors.length > 20) {
                await ctx.interaction.editReply({
                    content:
                        `Your search query, **\`${instructor}\`**, has too many results. Please narrow your` +
                        " query and try again.",
                });

                return -1;
            }

            if (allInstructors.length > 1) {
                const uIdentifier = Date.now() + "" + Math.random() + ctx.user.id;
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(uIdentifier + "_select")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Select an Instructor")
                    .addOptions(
                        allInstructors.map((x) => {
                            return {
                                label: x,
                                value: x,
                            };
                        })
                    );

                await ctx.interaction.editReply({
                    content:
                        "Please select the instructor that you want to specifically search. If you want to" +
                        " cancel this, press the Cancel button.",
                    components: AdvancedCollector.getActionRowsFromComponents([
                        selectMenu,
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(EmojiConstants.X_EMOJI)
                            .setLabel("Cancel")
                            .setCustomId(uIdentifier),
                    ]),
                });

                const selected = await AdvancedCollector.startInteractionEphemeralCollector(
                    {
                        targetAuthor: ctx.user,
                        acknowledgeImmediately: true,
                        targetChannel: ctx.channel,
                        duration: 30 * 1000,
                    },
                    uIdentifier
                );

                if (!selected || !selected.isStringSelectMenu()) {
                    await ctx.interaction.editReply({
                        content: "You either canceled this process or the process timed out.",
                        components: [],
                    });

                    return -1;
                }

                instructorToSearch = selected.values[0];
            } else {
                instructorToSearch = allInstructors[0];
            }
        }

        const [embed, res] = getCapeSummary({
            instructor: instructorToSearch,
            courseNumber: courseToSearch,
            showSummary: !showAll,
        });

        if (!embed) {
            await ctx.interaction.editReply({
                content:
                    res === CAPE_DATA.length
                        ? "Your query generated too many results; please narrow your query and try again."
                        : "Either no results were found or something is wrong with your input.",
                components: [],
            });

            return -1;
        }

        await ctx.interaction.editReply({
            content: null,
            embeds: [embed],
            components: [],
        });

        return 0;
    }
}
