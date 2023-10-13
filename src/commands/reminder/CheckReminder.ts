import BaseCommand, { ICommandContext, } from "../BaseCommand";
import { GeneralUtilities } from "../../utilities";
import { PostgresReminder as PostgresReminder } from "../../utilities/PostgresReminder";

export default class CheckReminder extends BaseCommand {
    public constructor() {
        super ({
            cmdCode: "CHECKREMINDER",
            formalCommandName: "CheckReminder",
            botCommandName: "checkreminder",
            description: "Check what upcoming reminders you have.",
            generalPermissions: [],
            botPermissions: [],
            argumentInfo: [],
            commandCooldown: 4 * 1000,
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const messages = await PostgresReminder.searchByUser(ctx.user.id);
        let formatted = "\n";
        for (const msg of messages) {
            if ("alert_time" in msg) {
                formatted += "* **" + msg.message + "** on " + msg.alert_time.toDateString() + ` \`(id: ${msg.id})\`` + "\n"; 
            }
        }
        // creates embed with reminders
        const remindEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, "Green")
            .setTitle("Reminder information")
            .setFooter({
                text: `Server Context: ${ctx.guild?.name ?? "Direct Message @edbird"}`,
            })
            .setDescription("Your future reminders: " + formatted + "\nTo delete reminders, use the /deleteReminder command with the reminder's id.");
        
        // after user sends slash command, reply with embed and button 
        await ctx.interaction.reply({
            embeds: [remindEmbed],
        });
        
        return 0;
    }
}