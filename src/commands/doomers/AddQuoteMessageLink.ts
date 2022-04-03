import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {GeneralConstants} from "../../constants/GeneralConstants";
import {QuoteHelpers} from "../../QuoteHelpers";

export class AddQuoteMessageLink extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "ADD_QUOTE_MSG_LINK",
            formalCommandName: "Add Quote by Message Link",
            botCommandName: "addquotelink",
            description: "Saves a quote by link. This should be used if you have a URL to the original message.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 10 * 1000,
            argumentInfo: [
                {
                    displayName: "Link to Message",
                    argName: "link",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The quote to save. This should be a link.",
                    required: true,
                    example: ["https://ptb.discord.com/channels/guild/channel/message_id"]
                }
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
        const link = ctx.interaction.options.getString("link", true);
        const splitLink = link.split("/");
        if (splitLink.length < 3) {
            await ctx.interaction.reply({
                content: "Your link is invalid. Try again.",
                ephemeral: true
            });
            return -1;
        }

        const msgId = splitLink.at(-1)!;
        const channelId = splitLink.at(-2)!;
        const guildId = splitLink.at(-3)!;

        await ctx.interaction.deferReply();
        const guild = await GeneralUtilities.tryExecuteAsync(async () => {
            return await ctx.interaction.client.guilds.fetch(guildId);
        });

        if (!guild) {
            await ctx.interaction.editReply({
                content: "The guild that you specified is invalid, or the bot does not access to the guild. Try again."
            });
            return -1;
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isText()) {
            await ctx.interaction.editReply({
                content: "The channel that you specified is invalid, or the bot does not access to the channel. Try" +
                    " again."
            });
            return -1;
        }

        const messageObj = await GeneralUtilities.tryExecuteAsync(async () => {
            return await channel.messages.fetch(msgId);
        });

        if (!messageObj) {
            await ctx.interaction.editReply({
                content: "The message referred to by the link could not be found."
            });
            return -1;
        }

        if (messageObj.content.length === 0 || messageObj.content.length > 1500) {
            await ctx.interaction.editReply({
                content: "The message you linked does not have any content, or it is too long."
            });
            return -1;
        }

        await QuoteHelpers.writeToQuoteJson({
            text: messageObj.content,
            author: {
                name: messageObj.author.id,
                fromMention: true
            }
        });

        await ctx.interaction.editReply({
            content: "Your quote has been saved."
        });

        return 0;
    }
}