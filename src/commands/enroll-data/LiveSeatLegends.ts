import { GeneralUtilities } from "../../utilities";
import BaseCommand, { ICommandContext } from "../BaseCommand";

export default class LiveSeatLegends extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "LIVE_SEAT_LEGENDS",
            formalCommandName: "Live Seat Legends",
            botCommandName: "liveseatlegends",
            description: "Gets information on what each column from the liveseats command means.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [],
            guildOnly: false,
            botOwnerOnly: false,
            botModeratorIds: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        await ctx.interaction.reply({
            embeds: [
                GeneralUtilities.generateBlankEmbed(ctx.user, "Random")
                    .addFields({
                        name: "ENR: Enrolled Count",
                        value: "Number of students *enrolled* in the section."
                    })
                    .addFields({
                        name: "AVA: Available Seats",
                        value: "Number of seats available in the section. This is what WebReg shows."
                    })
                    .addFields({
                        name: "TTL: Total Seats",
                        value: "The number of total seats available in the section.."
                    })
                    .addFields({
                        name: "WL: Waitlist Count",
                        value: "The number of students on the waitlist in the section."
                    })
                    .addFields({ name: "EN: Enrollable?", value: "Whether the section is enrollable." })
                    .addFields({ name: "V: Visible?", value: "Whether the section is visible on WebReg." }),
            ],
        });

        return 0;
    }
}
