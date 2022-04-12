import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {Constants} from "../../Constants";
import {Collection, EmbedFieldData, MessageEmbed} from "discord.js";
import {TimeUtilities} from "../../utilities/TimeUtilities";
import {StringUtil} from "../../utilities/StringUtilities";
import {manageMultipageEmbed} from "../enroll-data/helpers/Helper";
import {IInternalCourseData, ViewAllClassrooms} from "./ViewAllClassrooms";
import padTimeDigit = TimeUtilities.padTimeDigit;
import getTimeStr = TimeUtilities.getTimeStr;

export class ViewClassroomsOld extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "VIEW_CLASSROOMS_OLD",
            formalCommandName: "View Active/Inactive Classrooms",
            botCommandName: "viewclassroomsold",
            description: "Looks up either all active or inactive classrooms. This only uses all classrooms from this" +
                " term.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Show Inactive",
                    argName: "show_inactive",
                    type: ArgumentType.Boolean,
                    prettyType: "Boolean",
                    desc: "Whether to show classrooms that are not in use.",
                    required: true,
                    example: ["True"]
                },
                {
                    displayName: "Time",
                    argName: "time",
                    type: ArgumentType.String,
                    prettyType: "String",
                    desc: "The time that you want to look up.",
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
        const showInactive = ctx.interaction.options.getBoolean("show_inactive", true);
        const cDateTime = time ? new Date(time) : new Date();
        if (Number.isNaN(cDateTime.getTime())) {
            await ctx.interaction.reply({
                content: `The time that you specified, \`${time}\`, is invalid. Your time must have a date followed by`
                    + " a time; for example, `04/02/2022 4:15 PM`.",
                ephemeral: true
            });

            return -1;
        }

        await ctx.interaction.deferReply();
        let classrooms: string[] = ViewAllClassrooms.ALL_CLASSROOMS;
        let allCourses: IInternalCourseData[] = ViewAllClassrooms.ALL_COURSES;
        if (allCourses.length === 0) {
            ViewAllClassrooms.setVars();
            allCourses = ViewAllClassrooms.ALL_COURSES;
            classrooms = ViewAllClassrooms.ALL_CLASSROOMS;
        }

        const currDayOfWk = ViewAllClassrooms.DAY_OF_WEEK[cDateTime.getDay()];
        const currDateStr = cDateTime.getFullYear()
            + "-" + padTimeDigit(cDateTime.getMonth() + 1)
            + "-" + padTimeDigit(cDateTime.getDate());
        const currTimeNum = cDateTime.getHours() * 100 + cDateTime.getMinutes();

        // Assume that, if the day is a finals day, then there must be at least ONE course
        // with that final date which has a length of 179 minutes
        const isFinalTime = allCourses.some(x => x.day[0] === currDateStr
            && new Date(
                `01/01/20 ${x.endHr}:${padTimeDigit(x.endMin)}`
            ).getTime() - new Date(
                `01/01/20 ${x.startHr}:${padTimeDigit(x.startMin)}`
            ).getTime() === ViewAllClassrooms.FINAL_DURATION_TO_MS);

        // The key here is that we only want to consider each classroom *once*. We don't care
        // if there are duplicate courses (it's not like there's a class which has two lectures
        // at the same time in two different classrooms).
        const courses = [];
        main: for (const classroom of classrooms) {
            let sharedClasses = allCourses.filter(x => x.location === classroom);

            if (showInactive) {
                // We need to see if `classroom` is currently being used by *any* class.
                for (const c of sharedClasses) {
                    // If the current time is during c's time
                    if (c.startTime <= currTimeNum
                        && currTimeNum <= c.endTime
                        && (isFinalTime
                            ? c.day[0] === currDateStr
                            : c.day.includes(currDayOfWk) || c.day[0] === currDateStr)) {
                        // Then this means that this classroom is in use during this
                        // time. So, we move to the next classroom.
                        continue main;
                    }
                }

                // Don't care what class it is as long as it has the same *location*.
                courses.push(sharedClasses[0]);
                continue;
            }

            // Otherwise, we want all active classrooms. So, we merely need to find
            // one course that actually has section during the current time.
            for (const c of sharedClasses) {
                // If the current time is during c's time
                if (c.startTime <= currTimeNum
                    && currTimeNum <= c.endTime
                    && (isFinalTime
                        ? c.day[0] === currDateStr
                        : c.day.includes(currDayOfWk) || c.day[0] === currDateStr)) {
                    // Then we found the class so we can add it to the array
                    courses.push(c);
                    continue main;
                }
            }
        }

        let fields: EmbedFieldData[] = [];
        const coll: Collection<string, string[]> = new Collection<string, string[]>();
        // Just to keep track of rooms that we've seen
        if (showInactive) {
            for (const course of courses) {
                const [building, room] = course.location.split(" ");
                if (!coll.has(building)) {
                    coll.set(building, []);
                }

                coll.get(building)!.push(room);
            }

            for (const [building, rooms] of coll) {
                rooms.sort();
                fields.push({
                    name: ViewAllClassrooms.BUILDING_CODES[building]
                        ? `${building} - ${ViewAllClassrooms.BUILDING_CODES[building]}`
                        : building,
                    value: rooms.join(", ")
                });
            }
        }
        else {
            for (const c of courses) {
                const [building, room] = c.location.split(" ");
                if (!coll.has(building)) {
                    coll.set(building, []);
                }

                coll.get(building)!.push(`- ${room}: ${c.subjCourseId} (${c.meetingType}) [Sec. ${c.sectionFamily}]`);
            }

            for (const [building, rooms] of coll) {
                rooms.sort();
                fields.push({
                    name: ViewAllClassrooms.BUILDING_CODES[building]
                        ? `${building} - ${ViewAllClassrooms.BUILDING_CODES[building]}`
                        : building,
                    value: rooms.join("\n")
                });
            }
        }

        const embeds: MessageEmbed[] = [];
        let pageNum = 1;
        while (fields.length > 0) {
            const embed = new MessageEmbed()
                .setColor("DARK_GREEN")
                .setTitle((showInactive ? "Classrooms Not In Use" : "Classrooms In Use") + ` (${Constants.CACHED_DATA_TERM})`)
                .setDescription(
                    `It is currently **\`${getTimeStr(cDateTime.getHours(), cDateTime.getMinutes())}\`**.`
                    + ` Below are a list of classrooms that are ${(showInactive ? "not in use" : "in use")}.`
                ).setFooter({text: `Page ${pageNum++}`})
                .setTimestamp(cDateTime);

            const fieldsToAdd: EmbedFieldData[] = [];
            let sizeOfFields = 0;
            while (fields.length > 0) {
                if (sizeOfFields + fields[0].name.length + fields[0].value.length > 5000
                    || fieldsToAdd.length + 1 > 24) {
                    break;
                }

                const fieldOfInterest = fields.shift()!;
                fieldsToAdd.push(fieldOfInterest);
                sizeOfFields += (fieldOfInterest.name.length + fieldOfInterest.value.length);
            }

            for (const f of fieldsToAdd) {
                embed.addField(f.name, StringUtil.codifyString(f.value), f.inline);
            }

            embeds.push(embed);
        }

        // Add total pages.
        embeds.forEach(embed => {
            embed.footer!.text += `/${embeds.length}. ⚠️This command is deprecated and will be removed soon!`;
        });

        if (embeds.length === 0) {
            embeds.push(
                new MessageEmbed()
                    .setColor("DARK_RED")
                    .setTitle((showInactive ? "Classrooms Not In Use" : "Classrooms In Use") + ` (${Constants.CACHED_DATA_TERM})`)
                    .setDescription(
                        `Right now, it is **\`${getTimeStr(cDateTime.getHours(), cDateTime.getMinutes())}\`**.`
                        + " There are no classrooms that are " + (showInactive ? "not in use." : "in use.")
                    )
                    .setFooter({
                        text: `Page ${pageNum++}/1. ⚠️This command is deprecated and will be removed soon!`
                    }).setTimestamp(cDateTime)
            )
        }

        await manageMultipageEmbed(ctx, embeds);

        return 0;
    }
}