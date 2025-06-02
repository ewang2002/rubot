import BaseCommand, { ICommandContext, RequiredElevatedPermission } from "../BaseCommand";

export default class Ping extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "PING",
            formalCommandName: "Ping",
            botCommandName: "ping",
            description: "Runs the ping command.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 3 * 1000,
            argumentInfo: [],
            guildOnly: false,
            elevatedPermReq: RequiredElevatedPermission.None
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        await ctx.interaction.reply({
            content: `**Latency:** \`${ctx.user.client.ws.ping}\`ms.`,
        });
        return 0;
    }
}
