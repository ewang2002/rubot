import BaseCommand, { ArgumentType, ICommandContext, } from "../BaseCommand";

import { AdvancedCollector, GeneralUtilities, TimeUtilities, } from "../../utilities";
import { ButtonBuilder, ButtonStyle, ColorResolvable, TextInputBuilder, TextInputStyle } from "discord.js";
import { PostGresThing } from "../../utilities/PostGresThing";

export default class CreateReminder extends BaseCommand {
    public constructor() {
        super ({
            cmdCode: "CREATEREMINDER",
            formalCommandName: "CreateReminder",
            botCommandName: "createreminder",
            description: "Create a reminder.",
            generalPermissions: [],
            botPermissions: [],
            argumentInfo: [
                {
                    displayName: "Reminder Information", // what information the user would want to be reminded about
                    argName: "reminder_info",
                    type: ArgumentType.String,
                    desc: "The information you'd like to be reminded about.",
                    required: true,
                    example: ["CSE 100 homework due"],
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
        const reminderMsg = ctx.interaction.options.getString("reminder_info"); // get user input
        // unique ID for the message (per person)
        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;

        if (reminderMsg) {
            // creates embed (the message basically)
            const remindEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, "Green") // for waffle to see
                .setTitle("Reminder information")
                .setFooter({
                    text: `Server Context: ${ctx.guild?.name ?? "Direct Message @edbird"}`,
                })
                .setDescription("Hello! You'd like to be reminded about: " + `${reminderMsg}`);

            // after user sends in slash command, i'm going to reply with the embed and button 
            await ctx.interaction.reply({
                embeds: [remindEmbed],
                components: AdvancedCollector.getActionRowsFromComponents([
                    new ButtonBuilder()
                        .setLabel("Set Date")
                        .setCustomId(`${uniqueId}_date`)
                        .setStyle(ButtonStyle.Primary)
                ]), 
            });
        }
        
        //await ctx.interaction.deferReply(); // keeps ... thingy when loading (gives you an extra 15 minutes to press the button) (doesn't seem to work tho)

        // checks for [duration] if there's any button presses
        // if no interaction within [duration], just exit
        while (true) {
            const interact = await AdvancedCollector.startInteractionEphemeralCollector(
                {
                    acknowledgeImmediately: false,
                    duration: 2 * 60 * 1000,
                    targetAuthor: ctx.user,
                    targetChannel: ctx.channel,
                    clearInteractionsAfterComplete: true
                },
                uniqueId
            );

            if (!interact) {
                break;
            }
            if (interact.isButton()) {
                if (interact.customId === `${uniqueId}_date`) {
                    AdvancedCollector.sendTextModal(interact, 
                        {
                            modalTitle: "Set Date (24 Hour Time)",
                            inputs: [
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(2)
                                    .setLabel("Month (1-12)")
                                    .setCustomId("month")
                                    .setRequired(true),
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(2)
                                    .setLabel("Day (1-31)")
                                    .setCustomId("day")
                                    .setRequired(true),
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(4)
                                    .setLabel("Year (xxxx)")
                                    .setCustomId("year")
                                    .setRequired(true),
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(2)
                                    .setLabel("Hour (1-24)")
                                    .setCustomId("hour")
                                    .setRequired(true),
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(2)
                                    .setLabel("Minute (1-60)")
                                    .setCustomId("minute")
                                    .setRequired(true),
                            ],
                            duration: 60 * 1000
                        }, async (result) => {
                            await result.deferUpdate();
                            const month = Number.parseInt(result.fields.getTextInputValue("month"));
                            const day = Number.parseInt(result.fields.getTextInputValue("day"));
                            const year = Number.parseInt(result.fields.getTextInputValue("year"));
                            const hour = Number.parseInt(result.fields.getTextInputValue("hour"));
                            const minute = Number.parseInt(result.fields.getTextInputValue("minute"));
                            const date = new Date();
                            date.setMonth(month - 1);
                            date.setDate(day);
                            date.setFullYear(year);
                            date.setHours(hour);
                            date.setMinutes(minute);

                            // save the info
                            PostGresThing.insert(ctx.user.id, reminderMsg, date);

                            let message;
                            let color: ColorResolvable = "Green";
                            if (!Number.isNaN(date.getTime())) {
                                if (date < new Date()){
                                    message = "Sorry, we can't remind you in the past!";
                                    color = "Red";
                                }
                                else {
                                    message = "Date set! " + `${TimeUtilities.getDiscordTime({ time: date.getTime() })}, `+ "you'll be reminded about: " + `${reminderMsg}`;
                                    color = "Green";
                                }
                            }
                            else {
                                message = "Date not recognized! Try again.";
                                color = "Red";
                            }
                            const newEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, color)
                                .setTitle("Result")
                                .setFooter({
                                    text: `Server Context: ${ctx.guild?.name ?? "Direct Message @edbird"}`, })
                                .setDescription(message);
                            
                            await ctx.interaction.editReply({
                                embeds: [newEmbed],
                                components: []
                            });
                        });
                }
            }
        }
        return 0;
    }
}