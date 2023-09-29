// "If it works, don't question it."
import BaseCommand, { ArgumentType, ICommandContext } from "../BaseCommand";
import { DataRegistry } from "../../DataRegistry";
import { TimeUtilities, ArrayUtilities, StringUtil, AdvancedCollector, StringBuilder } from "../../utilities";
import { ButtonBuilder, ButtonStyle, Collection, EmbedBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { EmojiConstants, GeneralConstants, UCSDConstants } from "../../Constants";
import { getSelectMenusFromBuildings, getTimeFromObj, getUsedClassrooms } from "./Helpers/Helpers";
import getDateTime = TimeUtilities.getDateTime;

export default class ViewAllClassrooms extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "ALL_CLASSROOMS",
            formalCommandName: "All Classrooms",
            botCommandName: "allrooms",
            description: "Looks up all classrooms for a term.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Upcoming Time",
                    argName: "upcoming",
                    type: ArgumentType.Integer,
                    restrictions: {
                        integerMax: 120,
                        integerMin: 10,
                    },
                    desc: "The number of minutes to check in the future for future courses.",
                    required: true,
                    example: ["30"],
                }
            ],
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * Checks which classrooms are available, busy, or about to be used, and displays this data as a list of
     * embeds.
     * @param date The date.
     * @param minAhead The number of minutes to "look ahead"
     * @param uniqueId The identifier used for the collectors.
     * @param showFreeOnly Whether to show free classrooms only.
     * @returns A tuple containing the embeds to be displayed, an array of select menus to be used,
     * and an object containing classroom codes to index associations.
     */
    private helper(date: Date, minAhead: number, uniqueId: string, showFreeOnly: boolean): [
        EmbedBuilder[],
        { [label: string]: number },
        StringSelectMenuBuilder[]
    ] {
        const defaultEmbed = new EmbedBuilder()
            .setColor("Gold")
            .setTitle("Error Occurred When Displaying Classrooms")
            .setDescription(
                "There are either no classrooms to be displayed, or there are too many"
                + " classrooms available at the specified time. Try a different time."
            )
            .setFooter({ text: "No Free Classrooms :(" })
            .setTimestamp(date);

        const defaultSelectMenu = new StringSelectMenuBuilder()
            .addOptions({
                emoji: EmojiConstants.X_EMOJI,
                label: "End Process",
                value: "END_PROCESS",
                description: "Ends this menu.",
            })
            .setCustomId(`${uniqueId}_select_0`)
            .setPlaceholder("End Process");

        const coll = getUsedClassrooms(date, minAhead * 60 * 1000);
        // Key is the building
        // Value is the room +
        const embedCollection = new Collection<
            string,
            {
                available: string[];
                upcoming: { room: string; display: string }[];
                busy: { room: string; display: string }[];
            }
        >();
        for (const key in coll) {
            const [building, roomCode] = key.split(" ");
            if (!embedCollection.has(building)) {
                embedCollection.set(building, {
                    available: [],
                    upcoming: [],
                    busy: [],
                });
            }

            const obj = coll[key];

            const c = obj.current;
            const u = obj.upcomingSession;

            const getUpcomingAsStr = (sb: StringBuilder) => {
                for (const data of u) {
                    const oTimeStart = TimeUtilities.formatDuration(
                        getTimeFromObj(date, data, true).getTime() - date.getTime(),
                        false,
                        false
                    );

                    if (sb.length() === 0) {
                        sb.append(`- ${roomCode}`);
                    }

                    sb.appendLine()
                        .append(`  ${EmojiConstants.YELLOW_SQUARE_EMOJI} ${data.subjCourseId}`)
                        .append(` (${data.meetingType}) [${data.sectionFamily}]`)
                        .append(` ${EmojiConstants.RIGHT_TRIANGLE_EMOJI} ${oTimeStart}.`);
                }
            };

            // Case 1: no current session and no upcoming session
            if (c.length === 0 && u.length === 0) {
                embedCollection.get(building)!.available.push(roomCode);
                continue;
            }

            // Case 2: session active and either upcoming or not upcoming
            if (c.length > 0) {
                const sb = new StringBuilder();
                if (u.length > 0) {
                    getUpcomingAsStr(sb);
                }

                for (const act of c) {
                    const cTimeLeft = TimeUtilities.formatDuration(
                        getTimeFromObj(date, act, false).getTime() - date.getTime(),
                        false,
                        false
                    );

                    if (sb.length() === 0) {
                        sb.append(`- ${roomCode}`);
                    }

                    sb.appendLine()
                        .append(`  ${EmojiConstants.RED_SQUARE_EMOJI} ${act.subjCourseId}`)
                        .append(` (${act.meetingType}) [${act.sectionFamily}]`)
                        .append(` ${EmojiConstants.STOP_SIGN_EMOJI} ${cTimeLeft}.`);
                }

                embedCollection.get(building)!.busy.push({
                    room: roomCode,
                    display: sb.toString(),
                });
                continue;
            }

            // Case 3: only upcoming
            if (u.length > 0) {
                const sb = new StringBuilder();
                getUpcomingAsStr(sb);

                embedCollection.get(building)!.upcoming.push({
                    room: roomCode,
                    display: sb.toString(),
                });

                continue;
            }

            console.warn(`${building} ${roomCode} has issue.`);
        }

        embedCollection.forEach((v) => {
            v.busy.sort((a, b) => a.room.localeCompare(b.room));
            v.available.sort((a, b) => a.localeCompare(b));
            v.upcoming.sort((a, b) => a.room.localeCompare(b.room));
        });

        // As long as embedCollection has *some* number of elements, we should be fine
        const allBuildings = getSelectMenusFromBuildings(
            showFreeOnly
                ? Array.from(embedCollection.filter(x => x.available.length > 0).keys())
                : Array.from(embedCollection.keys()),
            uniqueId
        );

        // This should only hit if there are no free classrooms (implying that showFreeOnly is true)
        if (!allBuildings || allBuildings.length === 0) {
            return [[defaultEmbed], {}, [defaultSelectMenu]];
        }

        const embeds: EmbedBuilder[] = [];
        const labelToIdx: { [label: string]: number } = {};

        let i = 0;
        for (const [key, val] of embedCollection) {
            const buildingName = UCSDConstants.BUILDING_CODES[key];
            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle(
                    buildingName
                        ? `**${key}** - ${buildingName} (Term: ${DataRegistry.CONFIG.ucsdInfo.miscData.currentTermData.term})`
                        : `**${key}** (Term: ${DataRegistry.CONFIG.ucsdInfo.miscData.currentTermData.term})`
                )
                .setDescription(
                    "You are currently viewing all classrooms seen on WebReg for this building, starting at the time" +
                    ` **\`${getDateTime(date)}\`**. Also looking _ahead_ \`${minAhead}\` minute(s) as well. **Note:** Free`
                    + " rooms shown below are not guaranteed to be free; they may be locked or may be used by other people."
                )
                .setFooter({ text: `Page ${i + 1}` })
                .setTimestamp(date);

            // Available
            embed.addFields({
                name: `Available (Next ≥${minAhead} Minutes)`,
                value: StringUtil.codifyString(
                    val.available.length > 0 ? val.available.join(", ") : "None"
                )
            });

            if (!showFreeOnly) {
                // Upcoming only
                const upcomingFields = ArrayUtilities.arrayToStringFields(
                    val.upcoming,
                    (_, elem) => elem.display + "\n"
                );

                for (let i = 0; i < upcomingFields.length; i++) {
                    embed.addFields({
                        name: i === 0 ? "Upcoming Meetings" : GeneralConstants.ZERO_WIDTH_SPACE,
                        value: StringUtil.codifyString(upcomingFields[i])
                    });
                }

                const busyFields = ArrayUtilities.arrayToStringFields(
                    val.busy,
                    (_, elem) => elem.display + "\n"
                );

                for (let j = 0; j < busyFields.length; j++) {
                    embed.addFields({
                        name: j === 0 ? "In Use" : GeneralConstants.ZERO_WIDTH_SPACE,
                        value: StringUtil.codifyString(busyFields[j])
                    });
                }
            }

            embeds.push(embed);
            labelToIdx[key] = i++;
        }

        return [embeds, labelToIdx, allBuildings];
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        let numMinsAhead = ctx.interaction.options.getInteger("upcoming", true);
        let cDateTime = new Date();
        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;
        let showFreeOnly = true;
        let [embeds, labelToIdx, allBuildings] = this.helper(cDateTime, numMinsAhead, uniqueId, showFreeOnly);
        await ctx.interaction.deferReply();

        async function modifyInteractionEmbed(): Promise<void> {
            await ctx.interaction.editReply({
                embeds: [embeds[0]],
                components: AdvancedCollector.getActionRowsFromComponents([
                    new ButtonBuilder()
                        .setLabel("Use Diff. Date")
                        .setCustomId(`${uniqueId}_date`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(EmojiConstants.DATE_EMOJI),
                    new ButtonBuilder()
                        .setLabel("Use Diff. Time")
                        .setCustomId(`${uniqueId}_time`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(EmojiConstants.TIME_EMOJI),
                    new ButtonBuilder()
                        .setLabel("Use Current Date/Time")
                        .setCustomId(`${uniqueId}_reset`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(EmojiConstants.COUNTERCLOCKWISE_EMOJI),
                    new ButtonBuilder()
                        .setLabel("Set Lookahead Time")
                        .setCustomId(`${uniqueId}_lookahead`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(EmojiConstants.EYE_EMOJI),
                    new ButtonBuilder()
                        .setLabel(showFreeOnly ? "Show All Classrooms" : "Show Free Only")
                        .setCustomId(`${uniqueId}_free`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(EmojiConstants.UPSIDE_DOWN_EMOJI),
                    ...allBuildings
                ]),
            });
        }

        await modifyInteractionEmbed();

        await new Promise<void>(async (resolve) => {
            while (true) {
                const interact = await AdvancedCollector.startInteractionEphemeralCollector(
                    {
                        acknowledgeImmediately: false,
                        duration: 2 * 60 * 1000,
                        targetAuthor: ctx.user,
                        targetChannel: ctx.channel,
                    },
                    uniqueId
                );

                if (!interact) {
                    resolve();
                    return;
                }

                if (interact.isStringSelectMenu()) {
                    await interact.deferUpdate();
                    if (interact.values[0] === "END_PROCESS") {
                        resolve();
                        return;
                    }

                    await ctx.interaction.editReply({
                        embeds: [embeds[labelToIdx[interact.values[0]]]],
                    });

                    continue;
                }

                if (interact.isButton()) {
                    if (interact.customId === `${uniqueId}_date`) {
                        AdvancedCollector.sendTextModal(interact, {
                            modalTitle: "Set Date",
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
                                    .setLabel("Year")
                                    .setCustomId("year")
                                    .setRequired(true),
                            ],
                            duration: 60 * 1000
                        }, async (result) => {
                            await result.deferUpdate();
                            const month = Number.parseInt(result.fields.getTextInputValue("month"));
                            const day = Number.parseInt(result.fields.getTextInputValue("day"));
                            const year = Number.parseInt(result.fields.getTextInputValue("year"));
                            const date = new Date(cDateTime);
                            date.setMonth(month - 1);
                            date.setDate(day);
                            date.setFullYear(year);

                            if (!Number.isNaN(date.getTime())) {
                                cDateTime = date;
                                [embeds, labelToIdx, allBuildings] = this.helper(cDateTime, numMinsAhead, uniqueId, showFreeOnly);
                                await modifyInteractionEmbed();
                            }
                        });
                    }
                    else if (interact.customId === `${uniqueId}_time`) {
                        AdvancedCollector.sendTextModal(interact, {
                            modalTitle: "Set Time",
                            inputs: [
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(2)
                                    .setLabel("Hour (1-12)")
                                    .setCustomId("hour")
                                    .setRequired(true),
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(2)
                                    .setLabel("Minute (0-60)")
                                    .setCustomId("minute")
                                    .setRequired(true),
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(2)
                                    .setLabel("AM or PM?")
                                    .setCustomId("ampm")
                                    .setRequired(true),
                            ],
                            duration: 60 * 1000
                        }, async (result) => {
                            await result.deferUpdate();
                            const hour = Number.parseInt(result.fields.getTextInputValue("hour"));
                            const minute = Number.parseInt(result.fields.getTextInputValue("minute"));
                            const isAm = !result.fields.getTextInputValue("ampm").toLowerCase().includes("p");

                            const date = new Date(cDateTime);
                            if (isAm) {
                                date.setHours(hour === 12 ? 0 : hour);
                            }
                            else {
                                date.setHours(hour === 12 ? 12 : hour + 12);
                            }
                            date.setMinutes(minute);

                            if (!Number.isNaN(date.getTime())) {
                                cDateTime = date;
                                [embeds, labelToIdx, allBuildings] = this.helper(cDateTime, numMinsAhead, uniqueId, showFreeOnly);
                                await modifyInteractionEmbed();
                            }
                        });
                    }
                    else if (interact.customId === `${uniqueId}_free`) {
                        await interact.deferUpdate();
                        showFreeOnly = !showFreeOnly;
                        [embeds, labelToIdx, allBuildings] = this.helper(cDateTime, numMinsAhead, uniqueId, showFreeOnly);
                        await modifyInteractionEmbed();
                    }
                    else if (interact.customId === `${uniqueId}_lookahead`) {
                        AdvancedCollector.sendTextModal(interact, {
                            modalTitle: "Look Ahead By How Long?",
                            inputs: [
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setMaxLength(3)
                                    .setLabel("In Minutes (10-120)")
                                    .setCustomId("lookahead")
                                    .setRequired(true),
                            ],
                            duration: 60 * 1000
                        }, async (result) => {
                            await result.deferUpdate();
                            const lookahead = Number.parseInt(result.fields.getTextInputValue("lookahead"));
                            if (!Number.isNaN(lookahead) && lookahead >= 10 && lookahead <= 120) {
                                numMinsAhead = lookahead;
                            }

                            [embeds, labelToIdx, allBuildings] = this.helper(cDateTime, numMinsAhead, uniqueId, showFreeOnly);
                            await modifyInteractionEmbed();
                        });
                    }
                    else {
                        await interact.deferUpdate();
                        cDateTime = new Date();
                        [embeds, labelToIdx, allBuildings] = this.helper(cDateTime, numMinsAhead, uniqueId, showFreeOnly);
                        await modifyInteractionEmbed();
                    }

                    continue;
                }

                resolve();
                return;
            }
        });

        await ctx.interaction.editReply({
            components: [],
        });

        return 0;
    }
}
