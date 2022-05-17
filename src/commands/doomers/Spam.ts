import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralConstants} from "../../constants/GeneralConstants";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {NewsChannel, TextChannel} from "discord.js";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";

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
                {
                    displayName: "All Channel Mode",
                    argName: "mode",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to ping in random channels (true) or the current one (false). Default is false.",
                    required: false,
                    example: ["False"]
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
        const mention = ctx.interaction.options.getMentionable("member", true);
        const amt = ctx.interaction.options.getInteger("amount", true);
        const mode = ctx.interaction.options.getBoolean("mode", false) ?? false;
        const allChannels = Array.from(
            ctx.guild!.channels.cache
                .filter(x => x.isText() && x.permissionsFor(ctx.guild!.me!).has(["VIEW_CHANNEL", "SEND_MESSAGES"]))
                .values()
        ) as (TextChannel | NewsChannel)[];

        await ctx.interaction.reply({
            content: `Ok, ${ctx.user.toString()} executed the spam command on ${mention.toString()}.`
        });

        for (let i = 0; i < amt; ++i) {
            await GeneralUtilities.tryExecuteAsync(async () => {
                const channel = mode
                    ? ArrayUtilities.getRandomElement(allChannels)
                    : ctx.channel;

                const m = await GeneralUtilities.tryExecuteAsync(async () => {
                    return channel.send({content: mention.toString()});
                });

                if (m) {
                    await GeneralUtilities.tryExecuteAsync(async () => await m.delete());
                }
            });
        }

        return 0;
    }
}