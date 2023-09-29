import BaseCommand, { ICommandContext } from "../BaseCommand";
import { Data } from "../../Data";
import { ArrayUtilities } from "../../utilities/ArrayUtilities";
import { Collection, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } from "discord.js";
import { AdvancedCollector } from "../../utilities/AdvancedCollector";
import { EmojiConstants } from "../../Constants";
import { PLOT_ARGUMENTS, parseCourseSubjCode } from "./helpers/Helper";
import { IPlotInfo } from "../../definitions";

export default class GetSectionEnroll extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "GET_SECTION_ENROLL",
            formalCommandName: "Get Section Enrollment Graph",
            botCommandName: "sectionplot",
            description:
                "Gets the enrollment chart for a specific section for a particular course.",
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
        const term = ctx.interaction.options.getString("term", true);
        const searchType = ctx.interaction.options.getString("search_type", false) ?? "norm";

        let coll: Readonly<Collection<string, IPlotInfo[]>>;
        let display: string;
        switch (searchType) {
            case "wide":
                coll = Data.SECTION_ENROLL_WIDE;
                display = "Wide";
                break;
            default:
                // "norm" is the default
                coll = Data.SECTION_ENROLL;
                display = "Normal";
                break;
        }

        const arr = coll.get(term);
        if (!arr) {
            await ctx.interaction.reply({
                content: `The term, **\`${term}\`** (Display \`${display}\`), could not be found. Try again.`,
                ephemeral: true,
            });

            return -1;
        }

        const parsedCode = parseCourseSubjCode(code);
        const res = arr.filter((x) => {
            if (!x.fileName.includes("_")) {
                return false;
            }

            return x.fileName.split("_")[0] === parsedCode;
        });
        if (res.length === 0) {
            await ctx.interaction.reply({
                content:
                    `The course, **\`${parsedCode}\`**, (term **\`${term}\`** & display \`${display}\`) could not` +
                    " be found. It's possible that there is only one section (e.g. section A) for this course.",
                ephemeral: true,
            });

            return -1;
        }

        const uIdentifier = Date.now() + "" + Math.random();
        const selectMenus: StringSelectMenuBuilder[] = [];
        const subsets = ArrayUtilities.breakArrayIntoSubsets(res, 25);
        for (let i = 0; i < Math.min(4, subsets.length); i++) {
            selectMenus.push(
                new StringSelectMenuBuilder()
                    .setCustomId(`${uIdentifier}_${i}`)
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("All Possible Sections " + (i + 1))
                    .addOptions(
                        subsets[i].map((x) => {
                            const rawOpt = x.fileName.split("_");
                            return {
                                label: `${rawOpt[0]} (Section ${rawOpt[1]})`,
                                value: x.fileName,
                            };
                        })
                    )
            );
        }

        await ctx.interaction.reply({
            content: "Select the section that you want to see the enrollment graph for.",
            components: AdvancedCollector.getActionRowsFromComponents([
                ...selectMenus,
                new ButtonBuilder()
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(`${uIdentifier}_cancel`)
                    .setEmoji(EmojiConstants.X_EMOJI),
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
                content: "You either didn't respond in 30 seconds or you canceled this.",
                components: [],
            });

            return -1;
        }

        await ctx.interaction.editReply({
            content: "Requesting plot. This may take a few seconds.",
            components: [],
        });

        const data = res.find((x) => x.fileName === selected.values[0])!;
        const sec = data.fileName.split("_")[1];
        await ctx.interaction.editReply({
            files: [data.fileUrl],
            content: `Course **\`${parsedCode}\`**, Section **\`${sec}\`** (Term **\`${term}\`**, Display \`${display}\`)`,
            components: [],
        });

        return 0;
    }
}
