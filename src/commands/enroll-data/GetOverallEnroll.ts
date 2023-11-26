import BaseCommand, { ICommandContext } from "../BaseCommand";
import { DataRegistry } from "../../DataRegistry";
import { parseCourseSubjCode, PLOT_ARGUMENTS } from "./helpers/Helper";
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
            argumentInfo: PLOT_ARGUMENTS,
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const code = ctx.interaction.options.getString("course_subj_num", true);
        const term = ctx.interaction.options.getString("term", false);
        const searchType = ctx.interaction.options.getString("search_type", false) ?? "norm";

        let coll: Readonly<Collection<string, IPlotInfo[]>>;
        let display: string;
        const parsedCode = parseCourseSubjCode(code);

        switch (searchType) {
            case "wide":
                coll = DataRegistry.OVERALL_ENROLL_WIDE;
                display = "Wide";
                break;
            default:
                // "norm" is the default
                coll = DataRegistry.OVERALL_ENROLL;
                display = "Normal";
                break;
        }

        let classPlotInfo;
        // list of graphs to display
        const filesList = [];
        // list of terms that graphs are from
        const termsList = [];

        // if looking for a specific term
        if (term) {
            const allPlots = coll.get(term);
            if (!allPlots) {
                await ctx.interaction.reply({
                    content: `The term, **\`${term}\`** (Display \`${display}\`), could not be found. Try again.`,
                    ephemeral: true,
                });
    
                return -1;
            }

            classPlotInfo = allPlots.find((x) => x.fileName === parsedCode);
            if (!classPlotInfo) {
                await ctx.interaction.reply({
                    content:
                        `The course, **\`${parsedCode}\`**, (term **\`${term}\`** & display \`${display}\`) could not` +
                        " be found. Try again.",
                    ephemeral: true,
                });
    
                return -1;
            }
            filesList.push(classPlotInfo);
            termsList.push(term);
        }
        // if searching thru all recent terms
        else {
            const terms = DataRegistry.CONFIG.ucsdInfo.githubTerms.map((x) => {
                return { name: x.termName, value: x.term };
            });

            // look through last 6 quarters for the class
            for (const currTerm of terms.slice(0, 6)) {
                const allPlots = coll.get(currTerm.value);
                if (allPlots) {
                    const info = allPlots.find((x) => x.fileName === parsedCode);
                    if (info) {
                        filesList.push(info);
                        termsList.push("- " + currTerm.name + "\n");
                    }
                }
            }

            if (filesList.length === 0) {
                await ctx.interaction.reply({
                    content:
                        `Either the course, **\`${parsedCode}\`**, or graphs could not` + " be found. Try again.",
                    ephemeral: true,
                });

                return -1;
            }
        }

        await ctx.interaction.deferReply();
        await ctx.interaction.editReply({
            files: filesList.map((x) => {
                return x.fileUrl;
            }),
            content: `**__\`${parsedCode}\`__**\n${termsList.join("")}`,
        });

        return 0;
    }
}
