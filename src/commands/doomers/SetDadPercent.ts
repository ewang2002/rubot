import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralConstants} from "../../constants/GeneralConstants";
import {JsonManager} from "../../JsonManager";
import {TimeUtilities} from "../../utilities/TimeUtilities";

export class SetDadPercent extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "SET_DAD_PERCENT",
            formalCommandName: "Set Dad Joke Response Rate for User",
            botCommandName: "setdadresp",
            description: "Sets the percent chance that the bot will respond to a message containing \`I'm\` or some" +
                " variant.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 3 * 1000,
            argumentInfo: [
                {
                    displayName: "Target",
                    argName: "target",
                    type: ArgumentType.User,
                    prettyType: "User",
                    desc: "The person to target.",
                    required: true,
                    example: ["@User#0001"]
                },
                {
                    displayName: "Response Rate",
                    argName: "response",
                    type: ArgumentType.Integer,
                    restrictions: {
                        integerMin: 0,
                        integerMax: 100
                    },
                    prettyType: "Integer",
                    desc: "The percent response rate when the user uses \"I'm\" or some variant. 0% means the bot" +
                        " won't respond at all, 100% means every time.",
                    required: true,
                    example: ["30"]
                }
            ],
            guildOnly: true,
            botOwnerOnly: false,
            allowOnServers: GeneralConstants.PERMITTED_SERVER_IDS
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const mention = ctx.interaction.options.getUser("target", true);
        const percent = ctx.interaction.options.getInteger("response", true);

        await ctx.interaction.deferReply();
        if (mention.bot) {
            await ctx.interaction.editReply({
                content: "Sorry, you can't quote bots :( Unless you're a bot?"
            });
            return -1;
        }

        if (percent === 0) {
            await JsonManager.DadJsonFile.runOperation(d => {
                const idx = d.findIndex(x => x.id === mention.id);
                if (idx === -1) {
                    return d;
                }

                d.splice(idx, 1);
                console.info(`[${TimeUtilities.getDateTime()}] Deleted user with ID ${mention.id}.`);
                return d;
            });
        }
        else {
            await JsonManager.DadJsonFile.runOperation(d => {
                const idx = d.findIndex(x => x.id === mention.id);
                if (idx === -1) {
                    d.push({
                        id: mention.id,
                        percent: percent / 100
                    });
                }
                else {
                    d[idx].percent = percent / 100;
                }

                console.info(`[${TimeUtilities.getDateTime()}] Added user with ID ${mention.id} & percent `
                    + `${percent / 100}.`);
                return d;
            });
        }

        await ctx.interaction.editReply({
            content: `Target ${mention} has been saved with probability response of \`${percent / 100}\`.`,
            allowedMentions: {
                users: []
            }
        });

        return 0;
    }
}