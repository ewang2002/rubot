import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {GeneralConstants} from "../../constants/GeneralConstants";
import {StringBuilder} from "../../utilities/StringBuilder";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";
import {JsonManager} from "../../JsonManager";

export class GetRandomQuote extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "GET_RANDOM_QUOTE",
            formalCommandName: "Get Random Quote",
            botCommandName: "getquote",
            description: "Gets a random quote.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Filter By User",
                    argName: "filter_by_author",
                    type: ArgumentType.User,
                    prettyType: "User",
                    desc: "Lets you get a random quote made by the specified user.",
                    required: false,
                    example: ["@User#0001"]
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
        const filterByUser = ctx.interaction.options.getUser("filter_by_author");
        // Motivated by CSE 130:
        //         const randomQuote = (quotes => (filteredQuotes => filteredQuotes.length === 0
        //                ? null
        //                : ArrayUtilities.getRandomElement(filteredQuotes)
        //        )(
        //            filterByUser
        //                ? quotes.filter(x => x.author.name === filterByUser.id)
        //                : quotes
        //        ))(await QuoteHelpers.getAllQuotes());

        const filteredQuotes = filterByUser
            ? JsonManager.QuoteJsonFile.getCachedData().filter(x => x.author.name === filterByUser.id)
            : JsonManager.QuoteJsonFile.getCachedData();

        const randomQuote = filteredQuotes.length === 0
            ? null
            : ArrayUtilities.getRandomElement(filteredQuotes);

        if (!randomQuote) {
            await ctx.interaction.reply({
                content: filterByUser
                    ? "There are no saved quotes by that user. Why not add one?"
                    : "There are no saved quotes. Why not add one?",
                ephemeral: true
            });

            return -1;
        }

        let author = randomQuote.author.name;
        if (randomQuote.author.fromMention) {
            author = (await GeneralUtilities.tryExecuteAsync(async () => {
                return await ctx.guild!.members.fetch(randomQuote!.author.name)
            }))?.toString() ?? randomQuote.author.name;
        }

        await ctx.interaction.reply({
            content: new StringBuilder()
                .append(randomQuote.text.split("\n").map(x => "> " + x).join("\n"))
                .appendLine()
                .append(`- ${author}`)
                .toString(),
            allowedMentions: {
                users: [],
                parse: []
            }
        });

        return 0;
    }
}