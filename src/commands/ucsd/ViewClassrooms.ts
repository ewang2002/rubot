// "If it works, don't question it."
import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";
import {Constants} from "../../Constants";
import {Collection, EmbedFieldData, MessageEmbed} from "discord.js";
import {TimeUtilities} from "../../utilities/TimeUtilities";
import {StringUtil} from "../../utilities/StringUtilities";
import {manageMultipageEmbed} from "../enroll-data/helpers/Helper";
import SECTION_TERM_DATA = Constants.SECTION_TERM_DATA;
import padTimeDigit = TimeUtilities.padTimeDigit;
import getTimeStr = TimeUtilities.getTimeStr;

export class ViewClassrooms extends BaseCommand {
    private static DAY_OF_WEEK: string[] = [
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
    private static BUILDING_CODES: { [code: string]: string } = {
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
        "WLH": "Warren Lecture Hall (Warren)"
    };

    public constructor() {
        super({
            cmdCode: "VIEW_CLASSROOMS",
            formalCommandName: "View Active/Inactive Classrooms",
            botCommandName: "viewclassrooms",
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
        const showInactive = ctx.interaction.options.getBoolean("show_inactive", true);
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
        // We might want to put this as a constant, so we don't have to constantly recompute it
        const allCourses = SECTION_TERM_DATA.flatMap(x => x.meetings.map(m => {
            return {
                location: `${m.building} ${m.room}`,
                startTime: m.start_hr * 100 + m.start_min,
                endTime: m.end_hr * 100 + m.end_min,
                day: typeof m.meeting_days === "string" ? [m.meeting_days] : m.meeting_days,
                subjCourseId: x.subj_course_id,
                meetingType: m.meeting_type,
                startHr: m.start_hr,
                sectionFamily: x.section_code[0],
                startMin: m.start_min,
                endHr: m.end_hr,
                endMin: m.end_min
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

        allCourses.sort((a, b) => a.location.localeCompare(b.location));

        const classrooms = Array.from(new Set(allCourses.map(x => x.location)));
        const currTimeNum = cDateTime.getHours() * 100 + cDateTime.getMinutes();
        const currDayOfWk = ViewClassrooms.DAY_OF_WEEK[cDateTime.getDay()];
        const currDateStr = cDateTime.getFullYear()
            + "-" + padTimeDigit(cDateTime.getMonth() + 1)
            + "-" + padTimeDigit(cDateTime.getDate());

        // Assume that, if the day is a finals day, then there must be at least ONE course
        // with that final date which has a length of 179 minutes
        const isFinalTime = allCourses.some(x => x.day[0] === currDateStr
            && new Date(
                `01/01/20 ${x.endHr}:${padTimeDigit(x.endMin)}`
            ).getTime() - new Date(
                `01/01/20 ${x.startHr}:${padTimeDigit(x.startMin)}`
            ).getTime() > 170);

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
                            : c.day.includes(currDayOfWk))) {
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
                        : c.day.includes(currDayOfWk))) {
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
                    name: ViewClassrooms.BUILDING_CODES[building]
                        ? `${building} - ${ViewClassrooms.BUILDING_CODES[building]}`
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
                    name: ViewClassrooms.BUILDING_CODES[building]
                        ? `${building} - ${ViewClassrooms.BUILDING_CODES[building]}`
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
                .setTitle((showInactive ? "Classrooms Not In Use" : "Classrooms In Use") + ` (${Constants.TERM})`)
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
        embeds.forEach(embed => embed.footer!.text += `/${embeds.length}.`);

        if (embeds.length === 0) {
            embeds.push(
                new MessageEmbed()
                    .setColor("DARK_RED")
                    .setTitle((showInactive ? "Classrooms Not In Use" : "Classrooms In Use") + ` (${Constants.TERM})`)
                    .setDescription(
                        `Right now, it is **\`${getTimeStr(cDateTime.getHours(), cDateTime.getMinutes())}\`**.`
                        + " There are no classrooms that are " + (showInactive ? "not in use." : "in use.")
                    ).setFooter({text: `Page ${pageNum++}/1.`})
                    .setTimestamp(cDateTime)
            )
        }

        await manageMultipageEmbed(ctx, embeds);

        return 0;
    }
}