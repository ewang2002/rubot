import {BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {GeneralConstants} from "../../constants/GeneralConstants";
import {QuoteHelpers} from "../../QuoteHelpers";
import {StringBuilder} from "../../utilities/StringBuilder";

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
            argumentInfo: [],
            guildOnly: true,
            botOwnerOnly: false,
            allowOnServers: [GeneralConstants.DOOMERS_SERVER_ID]
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const randomQuote = QuoteHelpers.getRandomQuote();
        if (!randomQuote) {
            await ctx.interaction.reply({
                content: "There are no saved quotes. Why not add one?",
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