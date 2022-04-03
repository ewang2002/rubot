import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralConstants} from "../../constants/GeneralConstants";
import {QuoteHelpers} from "../../QuoteHelpers";

export class AddQuoteText extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "ADD_QUOTE_TEXT",
            formalCommandName: "Add Quote Text",
            botCommandName: "addquotetext",
            description: "Saves a quote by text. This should be used if you don't have a URL to the original message.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 3 * 1000,
            argumentInfo: [
                {
                    displayName: "Quote Text",
                    argName: "text",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The quote to save. This should be under 1000 characters long.",
                    required: true,
                    example: ["Why did I do this to myself? It's so dumb."]
                },
                {
                    displayName: "Author",
                    argName: "author",
                    type: ArgumentType.User,
                    prettyType: "User",
                    desc: "The author of the quote.",
                    required: true,
                    example: ["@User#0001"]
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
        const mention = ctx.interaction.options.getUser("author", true);
        const text = ctx.interaction.options.getString("text", true);

        if (text.length > 1500) {
            await ctx.interaction.editReply({
                content: "The text that you're trying to quote is too long."
            });
            return -1;
        }

        if (mention.bot) {
            await ctx.interaction.editReply({
                content: "Sorry, you can't quote bots :( Unless you're a bot?"
            });
            return -1;
        }

        await ctx.interaction.deferReply();
        await QuoteHelpers.writeToQuoteJson({
            text,
            author: {
                name: mention.id,
                fromMention: true
            }
        });

        await ctx.interaction.editReply({
            content: "Your quote has been saved."
        });

        return 0;
    }
}