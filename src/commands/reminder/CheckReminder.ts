import BaseCommand, { ICommandContext, } from "../BaseCommand";

import { GeneralUtilities } from "../../utilities";
// import { ButtonBuilder, ButtonStyle, ColorResolvable, TextInputBuilder, TextInputStyle } from "discord.js";
import { PostGresThing } from "../../utilities/PostGresThing";

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
        const messages = await PostGresThing.search(ctx.user.id, "user");
        let fmt_msg = "\n";
        for (let i = 0; i < messages.length; i++) {
            fmt_msg += "* " + messages[i].message + " on " + messages[i].alert_time.toDateString() + "\n";
        }

        // creates embed (the message basically)
        const remindEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, "Green") // for waffle to see
            .setTitle("Reminder information")
            .setFooter({
                text: `Server Context: ${ctx.guild?.name ?? "Direct Message @edbird"}`,
            })
            .setDescription("Your current reminders: " + fmt_msg);
        
        // after user sends in slash command, i'm going to reply with the embed and button 
        await ctx.interaction.reply({
            embeds: [remindEmbed],
        });
        
        return 0;
    }
}