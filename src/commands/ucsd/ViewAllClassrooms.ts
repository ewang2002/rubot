// "If it works, don't question it."
import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {MutableConstants} from "../../constants/MutableConstants";
import {TimeUtilities} from "../../utilities/TimeUtilities";
import {Collection, MessageEmbed, MessageSelectMenu, MessageSelectOptionData} from "discord.js";
import {EmojiConstants, GeneralConstants} from "../../constants/GeneralConstants";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";
import {StringUtil} from "../../utilities/StringUtilities";
import {AdvancedCollector} from "../../utilities/AdvancedCollector";
import {StringBuilder} from "../../utilities/StringBuilder";
import SECTION_TERM_DATA = MutableConstants.SECTION_TERM_DATA;
import padTimeDigit = TimeUtilities.padTimeDigit;
import getTimeStr = TimeUtilities.getTimeStr;
import getDateTime = TimeUtilities.getDateTime;

export interface IInternalCourseData {
    location: string;
    startTime: number;
    endTime: number;
    day: string[];
    subjCourseId: string;
    meetingType: string;
    startHr: number;
    sectionFamily: string;
    startMin: number;
    endHr: number;
    endMin: number;
    instructor: string[];
}

export class ViewAllClassrooms extends BaseCommand {
    public static FINAL_DURATION_TO_MS: number = 179 * 60 * 1000;

    public static DAY_OF_WEEK: string[] = [
        "Su",
        "M",
        "Tu",
        "W",
        "Th",
        "F",
        "Sa"
    ];

    // Scraped from https://registrar.ucsd.edu/StudentLink/bldg_codes.html
    // Using the scuffed script https://gist.github.com/ewang2002/129c20480273a9e86b683b06d4c0ec8a.
    public static BUILDING_CODES: { [code: string]: string } = {
        "APM": "Applied Physics & Mathematics Building (Muir)",
        "ASANT": "Asante Hall (Eleanor Roosevelt)",
        "BIO": "Biology Building (Muir)",
        "BIRCH": "Birch Aquarium (SIO)",
        "BONN": "Bonner Hall (Revelle)",
        "BSB": "Basic Science Building (Medical School)",
        "CCC": "Cross-Cultural Center (University Center)",
        "CENTR": "Center Hall (University Center)",
        "CICC": "Copely International Conference Center (Eleanor Roosevelt)",
        "CLICS": "Center for Library & Instructional Computing Services (Revelle)",
        "CLIN": "Clinical Sciences Building (Medical School)",
        "CMG": "Center for Molecular Genetics (Medical School)",
        "CMME": "Center for Molecular Medicine East (Medical School)",
        "CMMW": "Center for Molecular Medicine West (Medical School)",
        "CMRR": "Center for Magnetic Recording Research (Warren)",
        "CNCB": "Center for Neural Circuits and Behavior (Medical School)",
        "CRB": "Chemistry Research Building (Thurgood Marshall)",
        "CPMC": "Conrad Presbys Music Center (University Center)",
        "CSB": "Cognitive Science Building (Thurgood Marshall)",
        "CTL": "Catalyst (North Torrey Pines Living Learning Neighborhood)",
        "DANCE": "Wagner Dance Facility (Revelle)",
        "DSD": "Deep Sea Drilling Building (SIO)",
        "EBU1": "Engineering Building Unit 1 (Warren)",
        "EBU2": "Engineering Building Unit 2 (Warren)",
        "EBU3B": "Engineering Building Unit 3 (Warren)",
        "ECKRT": "SIO Library, Eckart Building (SIO)",
        "ECON": "Economics Building (Thurgood Marshall)",
        "ERCA": "Eleanor Roosevelt College Administration (Eleanor Roosevelt)",
        "FORUM": "Mandell Weiss Forum (Revelle)",
        "GEISL": "Geisel Library (University Center)",
        "GH": "Galbraith Hall (Revelle)",
        "HSS": "Humanities & Social Sciences Building (Muir)",
        "HUBBS": "Hubbs Hall (SIO)",
        "IGPP": "Institute of Geophysics & Planetary Physics (SIO)",
        "IOA": "Institute of the Americas (Eleanor Roosevelt)",
        "KECK": "W.M. Keck Building (fMRI) (Medical School)",
        "LASB": "Latin American Studies Building (Eleanor Roosevelt)",
        "LEDDN AUD": "Patrick J. Ledden Auditorium (formerly HSS 2250) (Muir)",
        "LFFB": "Leichtag Family Foundation Biomedical Research Building (Medical School)",
        "LIT": "Literature Building (Warren)",
        "MANDE": "Mandeville Center (Muir)",
        "MAYER": "Mayer Hall (Revelle)",
        "MCC": "Media Center/Communication Building (Thurgood Marshall)",
        "MCGIL": "William J. McGill Hall (Muir)",
        "MET": "Medical Education and Telemedicine (Medical School)",
        "MNDLR": "Mandler Hall (formerly McGill Hall Annex) (Muir)",
        "MTF": "Medical Teaching Facility (Medical School)",
        "MWEIS": "Mandell Weiss Center (Revelle)",
        "MYR-A": "Mayer Hall Addition (Revelle)",
        "NIERN": "Nierenberg Hall (SIO)",
        "NSB": "Natural Sciences Building (Revelle)",
        "NTV": "Nierenberg Hall Annex (SIO)",
        "OAR": "Ocean & Atmospheric Res Bldg (SIO)",
        "OFF": "Off Campus (Off Campus)",
        "OTRSN": "Otterson Hall (Eleanor Roosevelt)",
        "PACIF": "Pacific Hall (Revelle)",
        "PCYNH": "Pepper Canyon Hall (University Center)",
        "PETER": "Peterson Hall (Thurgood Marshall)",
        "PFBH": "Powell-Focht Bioengineering Hall (Warren)",
        "POTKR": "Potiker Theatre (Revelle)",
        "PRICE": "Price Center (University Center)",
        "RBC": "Robinson Building Complex (Eleanor Roosevelt)",
        "RECGM": "Recreation Gym (Muir)",
        "RITTR": "Ritter Hall (SIO)",
        "RVCOM": "Revelle Commons (Revelle)",
        "RVPRO": "Revelle College Provost Building (Revelle)",
        "SCHOL": "Scholander Hall (SIO)",
        "SCRB": "Stein Clinical Research Building (Medical School)",
        "SCRPS": "Scripps Building (SIO)",
        "SDSC": "San Diego Supercomputer Center (Eleanor Roosevelt)",
        "SEQUO": "Sequoyah Hall (Thurgood Marshall)",
        "SERF": "Science & Engineering Research Facility (University Center)",
        "SME": "Structural & Materials Science Engineering Building (Sixth)",
        "SOLIS": "Faustina Solis Lecture Hall (Thurgood Marshall)",
        "SPIES": "Fred N. Spies Hall (SIO)",
        "SSB": "Social Sciences Building (Eleanor Roosevelt)",
        "SSC": "Student Services Center (University Center)",
        "SVERD": "Sverdrup Hall (SIO)",
        "TBA": "To Be Arranged (N/A)",
        "TM102": "Thurgood Marshall College 102 (Thurgood Marshall)",
        "TMCA": "Thurgood Marshall College Administration Building (Thurgood Marshall)",
        "U201": "University Center, Building 201 (University Center)",
        "U303": "Cancer Research Facility (University Center)",
        "U409": "University Center, Building 409 (University Center)",
        "U413": "University Center, Building 413 (University Center)",
        "U413A": "University Center, Building 413A (University Center)",
        "U515": "University Center, Building 515 (formerly R515) (University Center)",
        "U516": "University Center, Building 516 (formerly R516) (University Center)",
        "U517": "University Center, Building 517 (formerly R517) (University Center)",
        "U518": "University Center, Building 518 (formerly R518) (University Center)",
        "UNEX": "University Extension Complex (Marshall)",
        "UREY": "Urey Hall (Revelle)",
        "URY-A": "Urey Hall Annex (Revelle)",
        "VAF": "Visual Arts Facility (formerly VIS) (Sixth)",
        "VAUGN": "Vaughan Hall (SIO)",
        "WFH": "Wells Fargo Hall (Eleanor Roosevelt)",
        "WLH": "Warren Lecture Hall (Warren)",
        "YORK": "Herbert F. York Undergraduate Sciences Building (Revelle)"
    };

    public constructor() {
        super({
            cmdCode: "VIEW_ALL_CLASSROOMS",
            formalCommandName: "View All Classrooms",
            botCommandName: "viewallclassrooms",
            description: "Looks up all classrooms for a term.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Upcoming Time",
                    argName: "upcoming",
                    type: ArgumentType.Integer,
                    prettyType: "Integer",
                    restrictions: {
                        integerMax: 120,
                        integerMin: 10
                    },
                    desc: "The number of minutes to check in the future for future courses. Defaults to 50 minutes.",
                    required: false,
                    example: ["30"]
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

    public static ALL_COURSES: IInternalCourseData[] = [];
    public static ALL_CLASSROOMS: string[] = [];

    /**
     * Sets all variables, in particular for all courses and all classrooms.
     */
    public static setVars(): void {
        ViewAllClassrooms.ALL_COURSES = SECTION_TERM_DATA.flatMap(x => x.meetings.map(m => {
            return {
                location: `${m.building} ${m.room}`,
                startTime: m.start_hr * 100 + m.start_min,
                endTime: m.end_hr * 100 + m.end_min,
                // This should never be null since, in the cached file, it's already defined as "n/a"
                day: (typeof m.meeting_days === "string" ? [m.meeting_days] : m.meeting_days) as string[],
                subjCourseId: x.subj_course_id,
                meetingType: m.meeting_type,
                startHr: m.start_hr,
                sectionFamily: /^\d+$/.test(x.section_code)
                    ? x.section_code.substring(x.section_code.length - 2)
                    : x.section_code[0],
                startMin: m.start_min,
                endHr: m.end_hr,
                endMin: m.end_min,
                instructor: x.instructors
            };
        })).filter(x => {
            if (x.location.trim() === "") {
                return false;
            }

            // If start/end time is 0, then invalid section
            if (x.startTime === 0 || x.endTime === 0) {
                return false;
            }

            // If day of week, must have at least one day.
            // If it is a date, must not be empty string
            if (x.day.length === 0 || (x.day.length === 1 && x.day[0].trim().length === 0)) {
                return false;
            }

            const [building,] = x.location.split(" ");
            return building !== "RCLAS" && building !== "TBA";
        });


        ViewAllClassrooms.ALL_COURSES.sort((a, b) => a.location.localeCompare(b.location));
        ViewAllClassrooms.ALL_CLASSROOMS = Array.from(new Set(ViewAllClassrooms.ALL_COURSES.map(x => x.location)));
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const numMinsAhead = ctx.interaction.options.getInteger("upcoming", false) ?? 50;
        const nextTime = numMinsAhead * 60 * 1000;

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

        await ctx.interaction.deferReply();
        let allCourses: IInternalCourseData[] = ViewAllClassrooms.ALL_COURSES;
        let classrooms: string[] = ViewAllClassrooms.ALL_CLASSROOMS;
        // If this length is 0, then compute it and then save it
        if (allCourses.length === 0) {
            ViewAllClassrooms.setVars();
            allCourses = ViewAllClassrooms.ALL_COURSES;
            classrooms = ViewAllClassrooms.ALL_CLASSROOMS;
        }

        const currTimeNum = cDateTime.getHours() * 100 + cDateTime.getMinutes();
        const currDayOfWk = ViewAllClassrooms.DAY_OF_WEEK[cDateTime.getDay()];
        const currDateStr = cDateTime.getFullYear()
            + "-" + padTimeDigit(cDateTime.getMonth() + 1)
            + "-" + padTimeDigit(cDateTime.getDate());

        // Assume that, if the day is a finals day, then there must be at least ONE course
        // with that final date which has a length of 179 minutes
        const isFinalTime = allCourses.some(x => x.day[0] === currDateStr
            && new Date(
                2022, 0, 1, x.endHr, x.endMin
            ).getTime() - new Date(
                2022, 0, 1, x.startHr, x.startMin
            ).getTime() === ViewAllClassrooms.FINAL_DURATION_TO_MS);

        const coll: {
            // Current:
            //  - If we're looking at ACTIVE sections, then current will be the currently active session, or null
            //    if no such section exists.
            //  - If we're looking at INACTIVE sections, then current will be some classroom with an inactive session,
            //    or null if it is currently in use.
            //
            // upcomingSession represents the next session.
            [k: string]: {
                current: IInternalCourseData[];
                upcomingSession: IInternalCourseData[];
            };
        } = {};

        const getTimeFromObj = (c: IInternalCourseData, useStart: boolean): Date => {
            const endDateTime = new Date(cDateTime);
            endDateTime.setHours(useStart ? c.startHr : c.endHr);
            endDateTime.setMinutes(useStart ? c.startMin : c.endMin);
            endDateTime.setSeconds(0);
            return endDateTime;
        };

        for (const classroom of classrooms) {
            // Filter the courses so that only the courses which is in progress or hasn't started yet is
            // left. Additionally, we only want classes that are on the current day.
            let sharedClasses = allCourses
                .filter(x => x.location === classroom
                    && (x.startTime >= currTimeNum || x.endTime >= currTimeNum)
                    && (isFinalTime
                        ? x.day[0] === currDateStr
                        : x.day.includes(currDayOfWk) || x.day[0] === currDateStr));
            // Sort the classes by start time.
            sharedClasses.sort((a, b) => a.startTime - b.startTime);
            coll[classroom] = {
                current: [],
                upcomingSession: []
            };

            if (sharedClasses.length === 0) {
                continue;
            }

            // Now we want to find all active classes
            // If the current time is between the first class's start, end time, then there is an
            // active session

            let i = 0;
            const seenCourses = new Set<string>();
            for (; i < sharedClasses.length; i++) {
                const classToCheck = sharedClasses[i];
                const identifier = `${classToCheck.subjCourseId}-${classToCheck.meetingType}`
                    + `-${classToCheck.startTime}-${classToCheck.endTime}-${classToCheck.sectionFamily}`;
                if (seenCourses.has(identifier)) {
                    continue;
                }

                if (classToCheck.startTime <= currTimeNum && currTimeNum <= classToCheck.endTime) {
                    coll[classroom].current.push(classToCheck);
                    seenCourses.add(identifier);
                    continue;
                }

                break;
            }


            seenCourses.clear();
            for (; i < sharedClasses.length; i++) {
                const classToCheck = sharedClasses[i];
                const identifier = `${classToCheck.subjCourseId}-${classToCheck.meetingType}`
                    + `-${classToCheck.startTime}-${classToCheck.endTime}-${classToCheck.sectionFamily}`;
                if (seenCourses.has(identifier)) {
                    continue;
                }

                if (getTimeFromObj(classToCheck, true).getTime() - cDateTime.getTime() <= nextTime) {
                    coll[classroom].upcomingSession.push(classToCheck);
                    seenCourses.add(identifier);
                    continue;
                }

                break;
            }
        }

        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;
        // Key is the building
        // Value is the room +
        const embedCollection = new Collection<string, {
            available: string[];
            upcoming: { room: string; display: string; }[];
            busy: { room: string; display: string; }[];
        }>();
        for (const key in coll) {
            const [building, roomCode] = key.split(" ");
            if (!embedCollection.has(building)) {
                embedCollection.set(building, {
                    available: [],
                    upcoming: [],
                    busy: []
                });
            }

            const obj = coll[key];

            const c = obj.current;
            const u = obj.upcomingSession;

            const getUpcomingAsStr = (sb: StringBuilder) => {
                for (const data of u) {
                    const oTimeStart = TimeUtilities.formatDuration(
                        getTimeFromObj(data, true).getTime() - cDateTime.getTime(),
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
                        getTimeFromObj(act, false).getTime() - cDateTime.getTime(),
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
                    display: sb.toString()
                });
                continue;
            }

            // Case 3: only upcoming
            if (u.length > 0) {
                const sb = new StringBuilder();
                getUpcomingAsStr(sb);

                embedCollection.get(building)!.upcoming.push({
                    room: roomCode,
                    display: sb.toString()
                });

                continue;
            }

            console.warn(`${building} ${roomCode} has issue.`);
        }

        embedCollection.forEach(v => {
            v.busy.sort((a, b) => a.room.localeCompare(b.room));
            v.available.sort((a, b) => a.localeCompare(b));
            v.upcoming.sort((a, b) => a.room.localeCompare(b.room));
        });

        // Make the embed
        const allBuildings: MessageSelectMenu[] = ArrayUtilities.breakArrayIntoSubsets(
            Array.from(embedCollection.keys()).map(x => {
                const b = ViewAllClassrooms.BUILDING_CODES[x];
                return {code: x, name: b ? b : x};
            }),
            25
        ).map((x, i) => {
            const menu = new MessageSelectMenu();
            const options: MessageSelectOptionData[] = [];
            for (const {code, name} of x) {
                options.push({
                    label: code,
                    value: code,
                    description: name
                });
            }

            return menu.addOptions(options)
                .setPlaceholder(`${x[0].code} - ${x.at(-1)!.code}`)
                .setCustomId(`${uniqueId}_select_${i}`);
        });

        const embeds: MessageEmbed[] = [];
        const labelToIdx: { [label: string]: number } = {};

        let i = 0;
        for (const [key, val] of embedCollection) {
            const buildingName = ViewAllClassrooms.BUILDING_CODES[key];
            const embed = new MessageEmbed()
                .setColor("GOLD")
                .setTitle(
                    buildingName
                        ? `**${key}** - ${buildingName} (Term: ${MutableConstants.CACHED_DATA_TERM})`
                        : `**${key}** (Term: ${MutableConstants.CACHED_DATA_TERM})`
                )
                .setDescription(
                    time
                        ? `👀 You are currently viewing classrooms for the time **\`${getDateTime(cDateTime)}\`**.`
                        + ` Here are all the classrooms seen on WebReg for this building during the specified time.`
                        + ` Also looking ahead **\`${numMinsAhead}\`** minutes as well.`
                        : `🟣 It is currently **\`${getTimeStr(cDateTime.getHours(), cDateTime.getMinutes())}\`**.`
                        + ` Here are all the classrooms seen on WebReg for this building at this time. Also looking`
                        + ` ahead **\`${numMinsAhead}\`** minutes as well.`
                )
                .setFooter({text: `Page ${i + 1}`})
                .setTimestamp(cDateTime);

            // Available
            embed.addField(
                `Available (Next ≥${numMinsAhead} Minutes)`,
                StringUtil.codifyString(val.available.length > 0 ? val.available.join(", ") : "None")
            );

            // Upcoming only
            const upcomingFields = ArrayUtilities.arrayToStringFields(
                val.upcoming,
                (i, elem) => elem.display + "\n"
            );

            for (let i = 0; i < upcomingFields.length; i++) {
                embed.addField(
                    i === 0 ? "Upcoming Meetings" : GeneralConstants.ZERO_WIDTH_SPACE,
                    StringUtil.codifyString(upcomingFields[i])
                );
            }


            const busyFields = ArrayUtilities.arrayToStringFields(
                val.busy,
                (i, elem) => elem.display + "\n"
            );

            for (let j = 0; j < busyFields.length; j++) {
                embed.addField(
                    j === 0 ? "In Use" : GeneralConstants.ZERO_WIDTH_SPACE,
                    StringUtil.codifyString(busyFields[j])
                );
            }

            embeds.push(embed);
            labelToIdx[key] = i++;
        }

        embeds.forEach(embed => embed.footer!.text += `/${embeds.length}.`);

        if (embeds.length === 0 || allBuildings.length === 0) {
            await ctx.interaction.editReply({
                content: "An unknown error occurred [1]."
            });

            return -1;
        }

        // Add the cancel option somehow
        // If the last dropdown is at the max possible amount
        if (allBuildings.at(-1)!.options.length === 25) {
            // If there are too many buildings
            if (allBuildings.length === 5) {
                await ctx.interaction.editReply({
                    content: "An unknown error occurred [2]."
                });

                return -1;
            }
            // Otherwise, just push a new select menu
            else {
                allBuildings.push(
                    new MessageSelectMenu()
                        .addOptions([
                            {
                                emoji: EmojiConstants.X_EMOJI,
                                label: "End Process",
                                value: "END_PROCESS",
                                description: "Ends this menu."
                            }
                        ])
                        .setPlaceholder("Close Process")
                        .setCustomId(`${uniqueId}_select_123`)
                );
            }
        }
        else {
            allBuildings.at(-1)!.addOptions([
                {
                    emoji: EmojiConstants.X_EMOJI,
                    label: "End Process",
                    value: "END_PROCESS",
                    description: "Ends this menu."
                }
            ]);

            // Set the cancel option as the very first option
            allBuildings.at(-1)!.options.unshift(allBuildings.at(-1)!.options.pop()!);
            allBuildings.at(-1)!.placeholder += " & End Process"
        }

        await ctx.interaction.editReply({
            embeds: [embeds[0]],
            components: AdvancedCollector.getActionRowsFromComponents(allBuildings)
        });

        await new Promise<void>(async resolve => {
            while (true) {
                const interact = await AdvancedCollector.startInteractionEphemeralCollector({
                    acknowledgeImmediately: true,
                    duration: 3 * 60 * 1000,
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