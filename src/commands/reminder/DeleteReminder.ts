import BaseCommand, { ArgumentType, ICommandContext, } from "../BaseCommand";

import { GeneralUtilities } from "../../utilities";
// import { ButtonBuilder, ButtonStyle, ColorResolvable, TextInputBuilder, TextInputStyle } from "discord.js";
import { PostGresReminder as PostGresReminder } from "../../utilities/PostGresReminder";
import { ColorResolvable } from "discord.js";

export default class DeleteReminder extends BaseCommand {
    public constructor() {
        super ({
            cmdCode: "DELETEREMINDER",
            formalCommandName: "DeleteReminder",
            botCommandName: "deletereminder",
            description: "Delete reminders you've previously set.",
            generalPermissions: [],
            botPermissions: [],
            argumentInfo: [
                {
                    displayName: "ID of reminder to delete",
                    argName: "delete_id",
                    type: ArgumentType.String,
                    desc: "The ID of the reminder you'd like to remove.",
                    required: true,
                    example: ["42"],
                },
            ],
            commandCooldown: 4 * 1000,
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const toDelete = ctx.interaction.options.getString("delete_id");
        const message = await PostGresReminder.searchByID(toDelete);
        
        const remindEmbed = GeneralUtilities.generateBlankEmbed(ctx.user);
        let color: ColorResolvable = "Green";

        if (toDelete) {
            const deleted = await PostGresReminder.deleteRow(toDelete);
            console.log(message);
            if (deleted && "rowCount" in deleted && deleted.rowCount === 0) {
                color = "Red";
                remindEmbed
                    .setTitle("Delete Unsuccessful")
                    .setColor(color)
                    .setDescription("Your reminder could not be found. Is the ID correct?");
            }
            else if ("message" in message[0]) {
                remindEmbed
                    .setTitle("Deleted!")
                    .setDescription("Your reminder, " + message[0].message + ", has been deleted.");
            }
        }

        // after user sends in slash command, reply with embed 
        await ctx.interaction.reply({
            embeds: [remindEmbed],
        });
        
        return 0;
    }
}