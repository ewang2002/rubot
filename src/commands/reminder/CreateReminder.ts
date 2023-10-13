import BaseCommand, { ArgumentType, ICommandContext, } from "../BaseCommand";
import { AdvancedCollector, GeneralUtilities, TimeUtilities, } from "../../utilities";
import { ButtonBuilder, ButtonStyle, ColorResolvable, TextInputBuilder, TextInputStyle } from "discord.js";
import { PostgresReminder } from "../../utilities/PostgresReminder";

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
                {   // information the user wants to be reminded about
                    displayName: "Reminder Information", 
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
        // get user input
        const reminderMsg = ctx.interaction.options.getString("reminder_info");
        // unique ID for the message so interactions don't collide
        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;

        // creates embed with the user's message
        const remindEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, "Green")
            .setTitle("Reminder information")
            .setFooter({
                text: `Server Context: ${ctx.guild?.name ?? "Direct Message @edbird"}`,
            })
            .setDescription("Hello! You'd like to be reminded about: " + `${reminderMsg}`);

        // after user sends slash command, reply with embed and button 
        await ctx.interaction.reply({
            embeds: [remindEmbed],
            components: AdvancedCollector.getActionRowsFromComponents([
                new ButtonBuilder()
                    .setLabel("Set Date")
                    .setCustomId(`${uniqueId}_date`)
                    .setStyle(ButtonStyle.Primary)
            ]), 
        });

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
            
            // if there's no button press within [duration], delete it
            if (!interact) {
                break;
            }

            if (interact.isButton()) {
                if (interact.customId === `${uniqueId}_date`) {
                    AdvancedCollector.sendTextModal(interact, 
                        {
                            modalTitle: "Set Date (24 Hour Time",
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
                            const month = Number.parseInt(result.fields.getTextInputValue("month"));
                            const day = Number.parseInt(result.fields.getTextInputValue("day"));
                            const year = Number.parseInt(result.fields.getTextInputValue("year"));
                            const hour = Number.parseInt(result.fields.getTextInputValue("hour"));
                            const minute = Number.parseInt(result.fields.getTextInputValue("minute"));

                            await result.deferUpdate();
                            const date = new Date();
                            date.setMonth(month - 1);
                            date.setDate(day);
                            date.setFullYear(year);
                            date.setHours(hour);
                            date.setMinutes(minute);

                            let message;
                            let color: ColorResolvable = "Green";
                            if (!Number.isNaN(date.getTime())) {
                                if (date < new Date()){
                                    message = "Sorry, we can't remind you in the past!";
                                    color = "Red";
                                }
                                else {
                                    // save the info into the db 
                                    PostgresReminder.insert(ctx.user.id, reminderMsg, date, ctx.channel.id);

                                    message = "Date set! " + `${TimeUtilities.getDiscordTime({ time: date.getTime() })}, `+ "you'll be reminded about: " + `${reminderMsg}`;
                                    color = "Green";
                                }
                            }
                            else {
                                message = "Date not recognized! Try again.";
                                color = "Red";
                            }

                            // change the old embed to contain information about their reminder
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