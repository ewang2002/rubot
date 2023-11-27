import BaseCommand, { ArgumentType, ICommandContext } from "../BaseCommand";
import { DataRegistry } from "../../DataRegistry";
import { parseCourseSubjCode } from "./helpers/Helper";
import { Collection } from "discord.js";
import { IPlotInfo } from "../../definitions";

export default class GetOverallEnroll extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "GET_OVERALL_ENROLL",
            formalCommandName: "Get Overall Enrollment Graph",
            botCommandName: "overallplot",
            description: "Gets the enrollment chart for all sections for a particular course.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
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
                    displayName: "Wide Plot",
                    argName: "wide_plot",
                    type: ArgumentType.Boolean,
                    desc: "Whether the returned graphs should be bigger graphs (6000x1500). Defaults to false.",
                    required: false,
                    example: [],
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
        await ctx.interaction.deferReply();

        const code = ctx.interaction.options.getString("course_subj_num", true);
        const term = ctx.interaction.options.getString("term", false);
        const wantsWidePlots = ctx.interaction.options.getBoolean("wide_plot", false) ?? false;

        const coll: Readonly<Collection<string, IPlotInfo[]>> = wantsWidePlots
            ? DataRegistry.OVERALL_ENROLL_WIDE
            : DataRegistry.OVERALL_ENROLL;
        const displayName: string = wantsWidePlots
            ? "Wide (6000 x 1500)"
            : "Normal (1500 x 700)";

        const parsedCode = parseCourseSubjCode(code);

        // list of graphs to display
        const filesList: IPlotInfo[] = [];
        // list of terms that graphs are from
        const termsList: string[] = [];

        // if looking for a specific term
        if (term) {
            const allPlots = coll.get(term);
            if (!allPlots) {
                await ctx.interaction.reply({
                    content: `The term, **\`${term}\`** (Display \`${displayName}\`), could not be found. Try again.`,
                    ephemeral: true,
                });
    
                return -1;
            }

            const classPlotInfo = allPlots.find((x) => x.fileName === parsedCode);
            if (classPlotInfo) {
                filesList.push(classPlotInfo);
                termsList.push(term);
            }
        }
        // if searching thru all recent terms
        else {
            const terms = DataRegistry.CONFIG.ucsdInfo.githubTerms.map((x) => {
                return { termName: x.termName, term: x.term };
            });

            // look through the 6 most recent quarters for the class
            for (const currTerm of terms.slice(0, 6)) {
                const allPlots = coll.get(currTerm.term);
                if (allPlots) {
                    const plot = allPlots.find((x) => x.fileName === parsedCode);
                    if (plot) {
                        filesList.push(plot);
                        termsList.push(currTerm.termName);
                    }
                }
            }
        }

        // If we cannot find any plots, then this means that the course couldn't be found, or no graphs were
        // generated for said course.
        if (filesList.length === 0) {
            await ctx.interaction.reply({
                content: `Either the course (**\`${parsedCode}\`**) or graphs could not be found. Try again.`,
                ephemeral: true,
            });

            return -1;
        }

        await ctx.interaction.editReply({
            files: filesList.map((x) => {
                return x.fileUrl;
            }),
            content: `**__\`${parsedCode}\`__**\n${termsList.map(t => `- ${t}`).join("\n")}`,
        });

        return 0;
    }
}
