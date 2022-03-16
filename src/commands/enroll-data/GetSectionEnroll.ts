import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {Bot} from "../../Bot";
import {Constants} from "../../Constants";
import {GetOverallEnroll} from "./GetOverallEnroll";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";
import {MessageButton, MessageSelectMenu} from "discord.js";
import {AdvancedCollector} from "../../utilities/AdvancedCollector";
import {EmojiConstants} from "../../constants/EmojiConstants";

export class GetSectionEnroll extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "GET_SECTION_ENROLL",
            formalCommandName: "Get Section Enrollment Graph",
            botCommandName: "getsection",
            description: "Gets the enrollment chart for a specific section for a particular course.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Term",
                    argName: "term",
                    type: ArgumentType.String,
                    restrictions: {
                        stringChoices: Bot.BotInstance.config.enrollData.terms.map(x => {
                            return [x, x];
                        })
                    },
                    prettyType: "String",
                    desc: "The term to get the graph for.",
                    required: true,
                    example: ["SP22"]
                },
                {
                    displayName: "Course & Subject Code",
                    argName: "course_subj_num",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The course subject code.",
                    required: true,
                    example: ["CSE 100", "MATH100A"]
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
        const term = ctx.interaction.options.getString("term", true);
        const arr = Constants.SECTION_ENROLL.get(term);
        if (!arr) {
            await ctx.interaction.reply({
                content: `The term, **\`${term}\`**, could not be found. Try again.`,
                ephemeral: true
            });

            return -1;
        }

        const parsedCode = GetOverallEnroll.parseCourseSubjCode(code);
        const res = arr.filter(x => {
            if (!x.name.includes("_")) {
                return false;
            }

            return x.name
                .replace(".png", "")
                .split("_")[0] === parsedCode;
        });
        if (res.length === 0) {
            await ctx.interaction.reply({
                content: `The course, **\`${parsedCode}\`**, (term **\`${term}\`**) could not be found. It's possible`
                    + " that there is only one section (e.g. section A) for this course.",
                ephemeral: true
            });

            return -1;
        }

        const uIdentifier = Date.now() + "" + Math.random();
        const selectMenus: MessageSelectMenu[] = [];
        const subsets = ArrayUtilities.breakArrayIntoSubsets(
            res,
            25
        );
        for (let i = 0; i < Math.min(4, subsets.length); i++) {
            selectMenus.push(
                new MessageSelectMenu()
                    .setCustomId(`${uIdentifier}_${i}`)
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("All Possible Sections " + (i + 1))
                    .addOptions(subsets[i].map(x => {
                        const rawOpt = x.name.replaceAll(".png", "").split("_");
                        return {
                            label: `${rawOpt[0]} (Section ${rawOpt[1]})`,
                            value: x.name
                        };
                    }))
            );
        }

        await ctx.interaction.reply({
            content: "Select the section that you want to see the enrollment graph for.",
            components: AdvancedCollector.getActionRowsFromComponents([
                ...selectMenus,
                new MessageButton()
                    .setLabel("Cancel")
                    .setStyle("DANGER")
                    .setCustomId(`${uIdentifier}_cancel`)
                    .setEmoji(EmojiConstants.X_EMOJI)
            ])
        });

        const selected = await AdvancedCollector.startInteractionEphemeralCollector({
            targetAuthor: ctx.user,
            acknowledgeImmediately: false,
            targetChannel: ctx.channel,
            duration: 30 * 1000
        }, uIdentifier);

        if (!selected || !selected.isSelectMenu()) {
            await ctx.interaction.editReply({
                content: "You either didn't respond in 30 seconds or you canceled this.",
                components: []
            });

            return -1;
        }

        const data = res.find(x => x.name === selected.values[0])!;
        const sec = data.name.split("_")[1].replaceAll(".png", "");
        await ctx.interaction.editReply({
            files: [data.download_url],
            content: `Course **\`${parsedCode}\`**, Section **\`${sec}\`** (Term **\`${term}\`**)`,
            components: []
        });

        return 0;
    }
}