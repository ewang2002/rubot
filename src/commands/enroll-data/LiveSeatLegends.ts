import { GeneralUtilities } from "../../utilities/GeneralUtilities";
import { BaseCommand, ICommandContext } from "../BaseCommand";

export class LiveSeatLegends extends BaseCommand {
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
            botOwnerOnly: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        await ctx.interaction.reply({
            embeds: [
                GeneralUtilities.generateBlankEmbed(ctx.user, "RANDOM")
                    .addField("ENR: Enrolled Count", "Number of students *enrolled* in the section.")
                    .addField("AVA: Available Seats", "Number of seats available in the section. This is what WebReg shows.")
                    .addField("TTL: Total Seats", "The number of total seats available in the section..")
                    .addField("WL: Waitlist Count", "The number of students on the waitlist in the section.")
                    .addField("EN: Enrollable?", "Whether the section is enrollable.")
                    .addField("V: Visible?", "Whether the section is visible on WebReg.")
            ]
        });

        return 0;
    }
}