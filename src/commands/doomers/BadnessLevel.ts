import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralConstants} from "../../constants/GeneralConstants";

export class BadnessLevel extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "BADNESS_LEVEL",
            formalCommandName: "Get Badness Level",
            botCommandName: "badness",
            description: "Checks the person's badness level.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 3 * 1000,
            argumentInfo: [
                {
                    displayName: "User",
                    argName: "user",
                    type: ArgumentType.User,
                    prettyType: "User",
                    desc: "The user to check badness.",
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
        const userToCheck = ctx.interaction.options.getUser("user", true);
        await ctx.interaction.reply({
            content: userToCheck.id === "332392016165994497"
                ? "Not bad at all (**`0/10`** on the badness scale, sorry Alex)."
                : userToCheck.bot
                    ? "Bots are better than clowns (**`0/10`** on the badness scale)."
                    : userToCheck.id === "198818611865845761"
                        ? "Probably too drunk to process this, but terrible (**`11/10`** on the badness scale)."
                        : userToCheck.id === "214561673502130176"
                            ? "Plays too much ranked league at 3am but claims he wants to fix his sleep schedule" +
                            " (**`11/10`** on the badness scale)"
                            : "Extremely bad (**`10/10`** on the badness scale)."
        });

        return 0;
    }
}