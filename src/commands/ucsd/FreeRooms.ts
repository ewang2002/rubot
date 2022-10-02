import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {Collection, MessageEmbed} from "discord.js";
import {getSelectMenusFromBuildings, getUsedClassrooms} from "./Helpers/Helpers";
import {MutableConstants} from "../../constants/MutableConstants";
import {StringUtil} from "../../utilities/StringUtilities";
import {ViewAllClassrooms} from "./ViewAllClassrooms";
import {AdvancedCollector} from "../../utilities/AdvancedCollector";
import {TimeUtilities} from "../../utilities/TimeUtilities";
import getDateTime = TimeUtilities.getDateTime;

export class FreeRooms extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "FREE_ROOMS",
            formalCommandName: "Free Rooms",
            botCommandName: "freerooms",
            description: "Looks for classrooms that are continuously available for the next number of minutes.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Minutes",
                    argName: "minutes",
                    type: ArgumentType.Integer,
                    prettyType: "Integer",
                    desc: "The number of minutes that the room should be available for, starting from current (or" +
                        " specified) time.",
                    restrictions: {
                        integerMin: 20,
                        integerMax: 16 * 60
                    },
                    required: true,
                    example: ["115"]
                },
                {
                    displayName: "Time",
                    argName: "time",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The specific time that you want to look up. Defaults to current time.",
                    required: false,
                    example: ["04/02/2002 1:30 PM."]
                }
            ],
            guildOnly: false,
            botOwnerOnly: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const time = ctx.interaction.options.getString("time", false);
        const cDateTime = time ? new Date(time) : new Date();
        if (Number.isNaN(cDateTime.getTime())) {
            await ctx.interaction.reply({
                content: `The time that you specified, \`${time}\`, is invalid. Your time must have a date followed by`
                    + " a time; for example, `04/02/2022 4:15 PM`.",
                ephemeral: true
            });

            return -1;
        }

        const minAhead = ctx.interaction.options.getInteger("minutes", true);
        await ctx.interaction.deferReply();

        // We use this function since this already does what we want it to do.
        const data = getUsedClassrooms(cDateTime, minAhead * 60 * 1000);
        const freeClassrooms = new Collection<string, string[]>();

        for (const classroom in data) {
            const [building, roomCode] = classroom.split(" ");
            if (!freeClassrooms.has(building)) {
                freeClassrooms.set(building, []);
            }

            if (data[classroom].upcomingSession.length === 0 && data[classroom].current.length === 0) {
                freeClassrooms.get(building)!.push(roomCode);
            }
        }

        // Remove any empty classrooms
        for (const [k, v] of freeClassrooms) {
            if (v.length === 0) {
                freeClassrooms.delete(k);
            }
        }

        freeClassrooms.forEach(v => v.sort((a, b) => a.localeCompare(b)));
        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;

        const allBuildings = getSelectMenusFromBuildings(Array.from(freeClassrooms.keys()), uniqueId);
        if (!allBuildings || allBuildings.length === 0) {
            await ctx.interaction.editReply({
                content: "An unknown error occurred; there are probably too many buildings to display."
            });

            return -1;
        }

        const embeds: MessageEmbed[] = [];
        const labelToIdx: { [label: string]: number } = {};

        let i = 0;
        for (const [key, val] of freeClassrooms) {
            const buildingName = ViewAllClassrooms.BUILDING_CODES[key];
            const embed = new MessageEmbed()
                .setColor("GOLD")
                .setTitle(
                    buildingName
                        ? `**${key}** - ${buildingName} (Term: ${MutableConstants.CACHED_DATA_TERM})`
                        : `**${key}** (Term: ${MutableConstants.CACHED_DATA_TERM})`
                )
                .setDescription(
                    `You are currently viewing all classrooms that are free for the next \`${minAhead}\` minute(s),`
                    + ` starting at the time **\`${getDateTime(cDateTime)}\`**. Keep in mind that these classrooms are`
                    + " free based on what WebReg says, and may be used for other purposes.\n\nNo, *Ruby*, I cannot"
                    + " tell you if a classroom listed here is locked; you'll need to check yourself -- y'know, by"
                    + " walking there or something (I know, hard stuff)."
                )
                .setFooter({text: `Free Classrooms Only. Page ${i + 1}`})
                .setTimestamp(cDateTime);

            // Available
            embed.addField("Available Classrooms", StringUtil.codifyString(
                val.length === 0
                    // This is already handled above, but just in case I decide to change things.
                    ? "None."
                    : val.join(", ")
            ));

            embeds.push(embed);
            labelToIdx[key] = i++;
        }

        if (embeds.length === 0) {
            await ctx.interaction.editReply({
                content: "An error occurred. There are probably no free classrooms available."
            });

            return -1;
        }

        await ctx.interaction.editReply({
            embeds: [embeds[0]],
            components: AdvancedCollector.getActionRowsFromComponents(allBuildings)
        });

        await new Promise<void>(async resolve => {
            while (true) {
                const interact = await AdvancedCollector.startInteractionEphemeralCollector({
                    acknowledgeImmediately: true,
                    duration: 2 * 60 * 1000,
                    targetAuthor: ctx.user,
                    targetChannel: ctx.channel
                }, uniqueId);

                if (!interact || !interact.isSelectMenu() || interact.values[0] === "END_PROCESS") {
                    resolve();
                    return;
                }


                await ctx.interaction.editReply({
                    embeds: [embeds[labelToIdx[interact.values[0]]]]
                });
            }
        });

        await ctx.interaction.editReply({
            components: []
        });

        return 0;
    }
}