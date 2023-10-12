import BaseCommand, { ICommandContext, } from "../BaseCommand";

import { GeneralUtilities } from "../../utilities";
// import { ButtonBuilder, ButtonStyle, ColorResolvable, TextInputBuilder, TextInputStyle } from "discord.js";
import { PostGresReminder as PostGresReminder } from "../../utilities/PostGresReminder";

export default class CheckReminder extends BaseCommand {
    public constructor() {
        super ({
            cmdCode: "CHECKREMINDER",
            formalCommandName: "CheckReminder",
            botCommandName: "checkreminder",
            description: "Check reminders.",
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
        const messages = await PostGresReminder.searchByUser(ctx.user.id);
        let fmt_msg = "\n";
        for (const msg of messages) {
            if ("alert_time" in msg) {
                fmt_msg += "* **" + msg.message + "** on " + msg.alert_time.toDateString() + ` \`(id: ${msg.id})\`` + "\n"; 
            }
        }

        // creates embed (the message basically)
        const remindEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, "Green") // for waffle to see
            .setTitle("Reminder information")
            .setFooter({
                text: `Server Context: ${ctx.guild?.name ?? "Direct Message @edbird"}`,
            })
            .setDescription("Your future reminders: " + fmt_msg + "\nTo delete reminders, use the /deleteReminder command with the reminder's id.");
        
        // after user sends in slash command, i'm going to reply with the embed and button 
        await ctx.interaction.reply({
            embeds: [remindEmbed],
        });
        
        return 0;
    }
}