import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {GeneralConstants} from "../../constants/GeneralConstants";

export class Spam extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "SPAM",
            formalCommandName: "Spam",
            botCommandName: "spam",
            description: "Spam-pings a person. Might get the bot blocked by the target.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 20 * 1000,
            argumentInfo: [
                {
                    displayName: "Person or Role to Spam",
                    argName: "member",
                    type: ArgumentType.Mention,
                    prettyType: "Mention",
                    desc: "The person, or role, to spam.",
                    required: true,
                    example: ["@a waffle"]
                },
                {
                    displayName: "Amount",
                    argName: "amount",
                    type: ArgumentType.Integer,
                    prettyType: "Integer",
                    desc: "The number of times to ping this person.",
                    restrictions: {
                        integerMin: 1,
                        integerMax: 100
                    },
                    required: true,
                    example: ["15"]
                },

            ],
            guildOnly: true,
            botOwnerOnly: false,
            allowOnServers: [GeneralConstants.DOOMERS_SERVER_ID]
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const mention = ctx.interaction.options.getMentionable("member", true);
        const amt = ctx.interaction.options.getInteger("amount", true);
        await ctx.interaction.reply({
            content: "Ok.",
            ephemeral: true
        });

        for (let i = 0; i < amt; ++i) {
            await GeneralUtilities.tryExecuteAsync(async () => {
                const m = await GeneralUtilities.tryExecuteAsync(async () => {
                    return ctx.channel.send({content: mention.toString()});
                });

                if (m) {
                    await GeneralUtilities.tryExecuteAsync(async () => await m.delete());
                }
            });
        }

        return 0;
    }
}