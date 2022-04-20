import {BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralConstants} from "../../constants/GeneralConstants";

export class WhereAyu extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "WHERE_AYU",
            formalCommandName: "Where is Alex?",
            botCommandName: "whereayu",
            description: "Where is Alex? Totally doesn't just ping Aaron for Alex's location.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 1 * 1000,
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
        await ctx.interaction.reply({
            content: "<@!198818611865845761>, where is Alex?"
        });

        return 0;
    }
}