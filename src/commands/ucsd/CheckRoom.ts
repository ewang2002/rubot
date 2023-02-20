import { ArgumentType, BaseCommand, ICommandContext } from "../BaseCommand";
import { IInternalCourseData, ViewAllClassrooms } from "./AllClassrooms";
import {
    Collection,
    ButtonBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder,
    SelectMenuComponentOptionData,
    ButtonStyle,
} from "discord.js";
import { ArrayUtilities } from "../../utilities/ArrayUtilities";
import { EmojiConstants, GeneralConstants } from "../../Constants";
import { AdvancedCollector } from "../../utilities/AdvancedCollector";
import { TimeUtilities } from "../../utilities/TimeUtilities";
import { StringBuilder } from "../../utilities/StringBuilder";
import { StringUtil } from "../../utilities/StringUtilities";
import { Data } from "../../Data";
import getTimeStr = TimeUtilities.getTimeStr;
import getWebRegDateStr = TimeUtilities.getWebRegDateStr;

export class CheckRoom extends BaseCommand {
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
        const [allCourses, classrooms] = ViewAllClassrooms.getCoursesClassrooms();

        const roomsToConsider: string[] = [];
        for (const c of classrooms) {
            const split = c.split(" ");
            if (split.length < 2) {
                continue;
            }

            const [, roomCode] = split;
            if (roomCode === roomToCheck) {
                roomsToConsider.push(c);
            }
        }

        if (roomsToConsider.length === 0) {
            await ctx.interaction.editReply({
                content:
                    `The room code/number that you provided, **\`${roomToCheck}\`**, was not found on WebReg.` +
                    " It's possible that the room that you specified isn't being used for this term, or that you" +
                    " incorrectly typed the room code/number.",
            });

            return -1;
        }

        // Get the classroom that we'll use
        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;
        const classroomToUse = await new Promise<string | null>(async (resolve) => {
            if (roomsToConsider.length === 1) {
                return resolve(roomsToConsider[0]);
            }

            const possibleRooms: StringSelectMenuBuilder[] = ArrayUtilities.breakArrayIntoSubsets(
                roomsToConsider.map((x) => {
                    const [building] = x.split(" ");
                    const b = ViewAllClassrooms.BUILDING_CODES[building];
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
                },
                uniqueId
            );

            if (!interact || !interact.isStringSelectMenu()) {
                return resolve(null);
            }

            return resolve(interact.values[0]);
        });

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
                    x.day.includes(currDateStr) || x.day.includes(ViewAllClassrooms.DAY_OF_WEEK[i])
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
                        `(Term: ${Data.CONFIG.ucsdInfo.miscData.currentTermData.term})`
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
