import BaseCommand, { ArgumentType, ICommandContext } from "../BaseCommand";
import {
    ButtonBuilder,
    ButtonStyle,
    Collection,
    EmbedBuilder,
    SelectMenuComponentOptionData,
    StringSelectMenuBuilder,
} from "discord.js";
import { AdvancedCollector, ArrayUtilities, StringBuilder, StringUtil, TimeUtilities } from "../../utilities";
import { EmojiConstants, GeneralConstants, UCSDConstants } from "../../Constants";
import { DataRegistry } from "../../DataRegistry";
import { IInternalCourseData } from "../../definitions";
import getTimeStr = TimeUtilities.getTimeStr;
import getWebRegDateStr = TimeUtilities.getWebRegDateStr;

export default class CheckRoom extends BaseCommand {
    public static LONG_DAY_OF_WEEK: string[] = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];

    public constructor() {
        super({
            cmdCode: "CHECK_ROOM",
            formalCommandName: "Check Room",
            botCommandName: "checkroom",
            description: "Checks a specific classroom's schedule for the day.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Room Number",
                    argName: "room",
                    type: ArgumentType.String,
                    desc: "The room number to check. For example, if you want to look at CENTR 115, type 115.",
                    required: true,
                    example: ["115"],
                },
            ],
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        await ctx.interaction.deferReply();
        const roomToCheck = ctx.interaction.options.getString("room", true).toUpperCase().trim();
        const [allCourses, classrooms] = DataRegistry.getInPersonSectionsAndClassrooms();

        // Get all classrooms from WebReg and look for the room number that matches the number the user
        // requested. For example, if the user provides '101', then we should end up with, e.g., 
        // [CENTR 101, NIERN 101, SSB 101, SUMNR 101]
        const roomsToConsider: string[] = [];
        for (const c of classrooms) {
            const [, roomCode] = c.split(" ");
            if (roomCode === roomToCheck) {
                roomsToConsider.push(c);
            }
        }

        // If we cannot find the room number in question (for example, the user provided a room number that
        // doesn't exist in WebReg), then notify them.
        if (roomsToConsider.length === 0) {
            await ctx.interaction.editReply({
                content:
                    `The room code/number that you provided, **\`${roomToCheck}\`**, was not found on WebReg.` +
                    " It's possible that the room that you specified isn't being used for this term, or that you" +
                    " incorrectly typed the room code/number.",
            });

            return -1;
        }

        // Now that we have an array of possible rooms (building + room), we can ask the user what room they want
        // to use. 
        const uniqueId = StringUtil.generateRandomString(15);
        const classroomToUse = await new Promise<string | null>(async (resolve) => {
            // If there's only one classroom that matches the room number, then we don't need to ask the user.
            if (roomsToConsider.length === 1) {
                return resolve(roomsToConsider[0]);
            }

            // Otherwise, we need to ask the user which room they want to pick. 
            const possibleRooms: StringSelectMenuBuilder[] = ArrayUtilities.breakArrayIntoSubsets(
                roomsToConsider.map((x) => {
                    const [building] = x.split(" ");
                    const b = UCSDConstants.BUILDING_CODES[building];
                    return { room: x, name: b ? b : x };
                }),
                25
            ).map((x, i) => {
                const menu = new StringSelectMenuBuilder();
                const options: SelectMenuComponentOptionData[] = [];
                for (const { room, name } of x) {
                    options.push({
                        label: room,
                        value: room,
                        description: name,
                    });
                }

                return menu.addOptions(options).setCustomId(`${uniqueId}_select_${i}`);
            });

            const cancelButton = new ButtonBuilder()
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setEmoji(EmojiConstants.X_EMOJI)
                .setCustomId(`${uniqueId}_CANCEL`);

            await ctx.interaction.editReply({
                content:
                    "There are multiple buildings with the same room code. Please select the correct room code." +
                    " If you don't see it, it's probably either because you typed the room code incorrectly or the" +
                    " room isn't in use for this term. If you want to cancel this process, press the **Cancel**" +
                    " button.",
                components: AdvancedCollector.getActionRowsFromComponents([
                    ...possibleRooms,
                    cancelButton,
                ]),
            });

            const interact = await AdvancedCollector.startInteractionEphemeralCollector(
                {
                    acknowledgeImmediately: true,
                    duration: 60 * 1000,
                    targetAuthor: ctx.user,
                    targetChannel: ctx.channel,
                    clearInteractionsAfterComplete: false
                },
                uniqueId
            );

            if (!interact || !interact.isStringSelectMenu()) {
                return resolve(null);
            }

            return resolve(interact.values[0]);
        });

        // If the user did NOT select a room, then we'll assume that they canceled the process
        // or the process timed out.
        if (!classroomToUse) {
            await ctx.interaction.editReply({
                content: "This process has either been canceled or has timed out.",
                components: [],
            });

            return -1;
        }

        // In case it's a final or midterm day, so we can keep track of that too
        const currDate = new Date();
        const currDateStr = getWebRegDateStr(currDate);

        // Create the fields for the display embed
        const coursesToUse = allCourses.filter((x) => x.location === classroomToUse);
        const embeds: EmbedBuilder[] = [];
        for (let i = 0; i < CheckRoom.LONG_DAY_OF_WEEK.length; i++) {
            const coursesToConsider = coursesToUse.filter(
                (x) =>
                    x.day.includes(currDateStr) || x.day.includes(GeneralConstants.DAYS_OF_WEEK[i])
            );

            // Categorize the courses into this collection based on timestamp. Also remove any duplicates.
            const coursesToPut = new Collection<string, IInternalCourseData[]>();
            const added: Set<string> = new Set<string>();
            const keys: { startTime: number; keyVal: string }[] = [];
            for (const c of coursesToConsider) {
                const identifier = `${c.subjCourseId}-${c.meetingType}-${c.startTime}-${c.endTime}-${c.sectionFamily}`;
                if (added.has(identifier)) {
                    continue;
                }

                const timestamp = `${getTimeStr(c.startHr, c.startMin)} - ${getTimeStr(
                    c.endHr,
                    c.endMin
                )}`;
                if (!coursesToPut.has(timestamp)) {
                    keys.push({ startTime: c.startTime, keyVal: timestamp });
                    coursesToPut.set(timestamp, []);
                }

                added.add(identifier);
                coursesToPut.get(timestamp)!.push(c);
            }

            // Sort by start time
            keys.sort((a, b) => a.startTime - b.startTime);
            const embed = new EmbedBuilder()
                .setTitle(
                    `**${classroomToUse}**: ${CheckRoom.LONG_DAY_OF_WEEK[i]} Schedule ` +
                    `(Term: ${DataRegistry.CONFIG.ucsdInfo.miscData.currentTermData.term})`
                )
                .setDescription(`Current Time: **\`${TimeUtilities.getDateTime(currDate)}\`**`)
                .setColor("Gold");

            // keyVal is the timestamp that we'll put as the name of the field
            for (const { keyVal } of keys) {
                const s = new StringBuilder();
                for (const v of coursesToPut.get(keyVal)!) {
                    s.append(`${v.subjCourseId} (${v.meetingType})`)
                        .appendLine()
                        .append(`- ${v.instructor.join(" & ")}`)
                        .appendLine()
                        .append(`- Section ${v.sectionFamily}`)
                        .appendLine();
                }

                embed.addFields({ name: keyVal, value: StringUtil.codifyString(s.toString()) });
            }

            if (embed.data.fields?.length === 0) {
                embed.addFields({
                    name: GeneralConstants.ZERO_WIDTH_SPACE,
                    value: "No sections are scheduled for today."
                });
            }

            embeds.push(embed);
        }

        const prevId = `${uniqueId}_PREV`;
        const stopId = `${uniqueId}_STOP`;
        const nextId = `${uniqueId}_NEXT`;
        const buttons: ButtonBuilder[] = [
            new ButtonBuilder()
                .setLabel("Previous")
                .setStyle(ButtonStyle.Primary)
                .setEmoji(EmojiConstants.LONG_LEFT_ARROW_EMOJI)
                .setCustomId(prevId),
            new ButtonBuilder()
                .setLabel("Stop")
                .setStyle(ButtonStyle.Danger)
                .setEmoji(EmojiConstants.STOP_SIGN_EMOJI)
                .setCustomId(stopId),
            new ButtonBuilder()
                .setLabel("Next")
                .setStyle(ButtonStyle.Primary)
                .setEmoji(EmojiConstants.LONG_RIGHT_TRIANGLE_EMOJI)
                .setCustomId(nextId),
        ];

        let idx = currDate.getDay();
        main: while (true) {
            await ctx.interaction.editReply({
                content: null,
                embeds: [embeds[idx]],
                components: AdvancedCollector.getActionRowsFromComponents(buttons),
            });

            const interact = await AdvancedCollector.startInteractionEphemeralCollector(
                {
                    acknowledgeImmediately: true,
                    duration: 2 * 60 * 1000,
                    targetAuthor: ctx.user,
                    targetChannel: ctx.channel,
                    clearInteractionsAfterComplete: false
                },
                uniqueId
            );

            if (!interact) {
                break;
            }

            switch (interact.customId) {
                case prevId: {
                    idx--;
                    if (idx < 0) {
                        idx += embeds.length;
                    }
                    break;
                }
                case stopId: {
                    break main;
                }
                case nextId: {
                    idx++;
                    idx %= embeds.length;
                    break;
                }
                default: {
                    break main;
                }
            }
        }

        await ctx.interaction.editReply({
            components: [],
        });

        return 0;
    }
}
