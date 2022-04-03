import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralConstants} from "../../constants/GeneralConstants";
import {QuoteHelpers} from "../../QuoteHelpers";

export class AddStrangerQuote extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "ADD_STRANGER_QUOTE",
            formalCommandName: "Add Quote Text (Stranger)",
            botCommandName: "addstrangerquote",
            description: "Saves a quote by text. This should be used if you don't have a URL to the original message" +
                " *and* the person you're quoting isn't in the server that you're in.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 10 * 1000,
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
                    type: ArgumentType.String,
                    prettyType: "User",
                    desc: "The author of the quote.",
                    required: true,
                    example: ["user"]
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
        const author = ctx.interaction.options.getString("author", true);
        const text = ctx.interaction.options.getString("text", true);

        if (text.length > 1500) {
            await ctx.interaction.editReply({
                content: "The text that you're trying to quote is too long."
            });
            return -1;
        }

        await ctx.interaction.deferReply();
        await QuoteHelpers.writeToQuoteJson({
            text,
            author: {
                name: author,
                fromMention: false
            }
        });

        await ctx.interaction.editReply({
            content: "Your quote has been saved."
        });

        return 0;
    }
}