import { Collection } from "discord.js";
import {
    ICapeRow,
    IConfiguration,
    IInternalCourseData,
    IPlotInfo,
    ListedCourse,
    Meeting,
    WebRegSection
} from "./definitions";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import * as path from "path";
import { GeneralUtilities, TimeUtilities } from "./utilities";
import axios, { AxiosInstance } from "axios";
import { RegexConstants } from "./Constants";

/**
 * A namespace containing a lot of data that the bot will be using.
 */
export namespace DataRegistry {
    /**
     * The HTTP client used to make web requests.
     *
     * @type {AxiosInstance}
     */
    export const AXIOS: AxiosInstance = axios.create();

    /**
     * Initializes all static data, i.e., data from files. This will not initialize any data that
     * needs to be requested from the internet.
     *
     * @param {IConfiguration} config The configuration information from the configuration file.
     */
    export function initStaticData(config: IConfiguration): void {
        CONFIG = config;
        DEFAULT_TERM = config.ucsdInfo.currentWebRegTerms[0].term;

        if (config.ucsdInfo.miscData.currentTermData.fileName) {
            initSectionData(config.ucsdInfo.miscData.currentTermData.fileName);
        }

        if (config.ucsdInfo.miscData.capeData.fileName) {
            initCapeData(config.ucsdInfo.miscData.capeData.fileName);
        }

        if (config.ucsdInfo.miscData.courseList.fileName) {
            initCourseListing(config.ucsdInfo.miscData.courseList.fileName);
        }
    }

    export let CONFIG: IConfiguration;

    /**
     * The default term available on WebReg. For example, if two terms are available on
     * WebReg, we want to set one of those two terms as the default term so the user
     * doesn't need to specify it explicitly.
     */
    export let DEFAULT_TERM: string;

    export const OVERALL_ENROLL: Collection<string, IPlotInfo[]> = new Collection<
        string,
        IPlotInfo[]
    >();
    export const OVERALL_ENROLL_WIDE: Collection<string, IPlotInfo[]> = new Collection<
        string,
        IPlotInfo[]
    >();
    export const SECTION_ENROLL: Collection<string, IPlotInfo[]> = new Collection<
        string,
        IPlotInfo[]
    >();
    export const SECTION_ENROLL_WIDE: Collection<string, IPlotInfo[]> = new Collection<
        string,
        IPlotInfo[]
    >();
    export const CAPE_DATA: ICapeRow[] = [];
    export const COURSE_LISTING: ListedCourse[] = [];

    // All sections offered for the current term. The response object mimics how 
    // the scraper returns section data. 
    export const SECTION_TERM_DATA: WebRegSection[] = [];

    // All in-person *meetings*. 
    let ALL_IN_PERSON_MEETINGS: IInternalCourseData[] = [];
    let ALL_CLASSROOMS: string[] = [];

    /**
     * Adds the section data to the above array.
     * @param {string} fileName The file containing the section data.
     */
    function initSectionData(fileName: string): void {
        const pathToRead = path.join(__dirname, "..", fileName);
        const readStream = createReadStream(pathToRead);
        const rl = createInterface(readStream);
        let firstLinePassed = false;

        // For each entry in the TSV file, we're going to extract data like the
        // subject, course ID (e.g., CSE 100), the section code (e.g., A01), the
        // section ID (e.g., A01), the instructor, total seats. and the meetings.
        //
        // At the end, we'll create the section object for each section. 
        rl.on("line", (line) => {
            if (!firstLinePassed) {
                firstLinePassed = true;
                return;
            }

            const rawData = line.split("\t");
            if (rawData.length !== 6) {
                console.error(
                    `Bad line read for section data; got ${rawData.length} but expected 5.`
                );
                return;
            }

            const [subjCourseId, sectionCode, sectionId, instructor, totalSeats, meetings] =
                rawData;

            // For the meetings in particular, we're going to deserialize the representation
            // stored in the TSV file into a `Meeting` object.
            const allMeetings: (Meeting | null)[] = meetings.split("|").map((x) => {
                const meeting = x.split(",");
                if (meeting.length !== 4) {
                    console.error(`Bad meeting read - ${sectionId}`);
                    return null;
                }

                const [meetingType, rawMeetingDays, rawTimes, rawLocation] = meeting;

                // Parse meeting days first.
                let meetingDays: string[] | string;
                if (rawMeetingDays.includes("-")) {
                    meetingDays = rawMeetingDays;
                }
                else {
                    meetingDays = TimeUtilities.getAllDays(rawMeetingDays);
                }

                const times = rawTimes.split(/:| - /).map((x) => Number.parseInt(x, 10));
                if (times.length !== 4) {
                    console.error(`Bad meeting time read - ${sectionId}`);
                    return null;
                }

                const [startHr, startMin, endHr, endMin] = times;
                const splitLocation = rawLocation.split(" ");
                let building;
                let room = "";
                if (splitLocation.length === 2) {
                    building = splitLocation[0];
                    room = splitLocation[1];
                }
                else if (splitLocation.length < 2) {
                    building = splitLocation[0];
                    console.warn(`Weird location - ${sectionId}`);
                }
                else {
                    building = splitLocation.shift()!;
                    room = splitLocation.join(" ");
                }

                return {
                    meeting_type: meetingType,
                    meeting_days: meetingDays,
                    start_hr: startHr,
                    start_min: startMin,
                    end_hr: endHr,
                    end_min: endMin,
                    building,
                    room,
                };
            });

            SECTION_TERM_DATA.push({
                available_seats: -1,
                enrolled_ct: -1,
                all_instructors: instructor.split(" & "),
                meetings: allMeetings.filter((x) => x !== null) as Meeting[],
                needs_waitlist: false,
                section_code: sectionCode,
                section_id: sectionId,
                subj_course_id: subjCourseId,
                total_seats: Number.parseInt(totalSeats, 10),
                waitlist_ct: -1,
                is_visible: false,
            });
        });

        // For each section, we're going to map them to individual meeting objects
        // and also filter out invalid or remote meetings. This will be used for finding
        // free rooms.
        rl.on("close", () => {
            console.info(`Done reading SECTION. Data length: ${CAPE_DATA.length}`);

            ALL_IN_PERSON_MEETINGS = SECTION_TERM_DATA.flatMap((x) =>
                x.meetings.map((m) => {
                    return {
                        location: `${m.building} ${m.room}`,
                        startTime: m.start_hr * 100 + m.start_min,
                        endTime: m.end_hr * 100 + m.end_min,
                        // This should never be null since, in the cached file, it's already defined as "n/a"
                        day: (typeof m.meeting_days === "string"
                            ? [m.meeting_days.trim()]
                            : m.meeting_days) as string[],
                        subjCourseId: x.subj_course_id,
                        meetingType: m.meeting_type,
                        startHr: m.start_hr,
                        sectionFamily: RegexConstants.ONLY_DIGITS_REGEX.test(x.section_code)
                            ? x.section_code.substring(x.section_code.length - 2)
                            : x.section_code[0],
                        startMin: m.start_min,
                        endHr: m.end_hr,
                        endMin: m.end_min,
                        instructor: x.all_instructors,
                    };
                })
            ).filter((x) => {
                // No location means the location hasn't been specified, so we can ignore this
                // meeting.
                if (x.location.trim() === "") {
                    return false;
                }

                // If start/end time is 0, then invalid meeting (meeting might not have been
                // defined).
                if (x.startTime === 0 || x.endTime === 0) {
                    return false;
                }

                // If day of week (represented as array of days (e.g., [M, W, F])), must have at least one day.
                // If it is a date (represented as array with one date (e.g., [2024-01-02])), must not be empty string
                if (x.day.length === 0 || (x.day.length === 1 && x.day[0].length === 0)) {
                    return false;
                }

                // The location should be of the form "<BUILDING> <ROOM NUMBER>" (e.g., "CENTR 101")
                const locSplit = x.location.split(" ");
                // If we do not have two entries in the array, then there is a problem with the formatting of
                // the meeting location.
                if (locSplit.length !== 2) {
                    return false;
                }

                // The building not be RCLAS or undefined room, since we only want in-person classes.
                return locSplit[0] !== "RCLAS" && locSplit[0] !== "TBA";
            }).sort((a, b) => a.location.localeCompare(b.location));

            ALL_CLASSROOMS = Array.from(
                new Set(ALL_IN_PERSON_MEETINGS.map((x) => x.location))
            );
        });
    }

    /**
     * Adds the CAPE data to the above array.
     * @param {string} capeFileName The file name corresponding to the file containing CAPE data.
     */
    function initCapeData(capeFileName: string): void {
        const pathToRead = path.join(__dirname, "..", capeFileName);
        const readStream = createReadStream(pathToRead);
        const rl = createInterface(readStream);

        let firstLinePassed = false;
        rl.on("line", (line) => {
            if (!firstLinePassed) {
                firstLinePassed = true;
                return;
            }

            const rawData = line.split("\t");
            if (rawData.length !== 11) {
                console.error(
                    `Bad line read for CAPE data; got ${rawData.length} but expected 11.`
                );
                return;
            }

            const [
                instructor,
                subCourse,
                course,
                term,
                enroll,
                evalsMade,
                rcmdClass,
                rcmdInstr,
                studyHrWk,
                avgGradeExp,
                avgGradeRec,
            ] = rawData;

            CAPE_DATA.push({
                instructor,
                subjectCourse: subCourse,
                courseName: course,
                term,
                enrollmentCount: Number.parseFloat(enroll),
                evaluationsMade: Number.parseFloat(evalsMade),
                recommendedClass: Number.parseFloat(rcmdClass),
                recommendedInstructor: Number.parseFloat(rcmdInstr),
                studyHourWeek: Number.parseFloat(studyHrWk),
                averageGradeExp: Number.parseFloat(avgGradeExp),
                averageGradeRec: Number.parseFloat(avgGradeRec),
            });
        });

        rl.on("close", () => {
            console.info(`Done reading CAPEs. Data length: ${CAPE_DATA.length}`);
        });
    }

    /**
     * Adds the course listing data to the above array.
     * @param {string} courseListName The file containing the course listing.
     */
    function initCourseListing(courseListName: string): void {
        const pathToRead = path.join(__dirname, "..", courseListName);
        const readStream = createReadStream(pathToRead);
        const rl = createInterface(readStream);

        let firstLinePassed = false;
        rl.on("line", (line) => {
            if (!firstLinePassed) {
                firstLinePassed = true;
                return;
            }

            const rawData = line.split("\t");
            if (rawData.length !== 5) {
                console.error(
                    `Bad line read for course listing data; got ${rawData.length} but expected 5.`
                );
                return;
            }

            const [department, subjCourse, courseName, units, description] = rawData;

            COURSE_LISTING.push({
                department,
                courseName,
                subjCourse,
                units,
                description,
            });
        });

        rl.on("close", () => {
            console.info(`Done reading course listing. Data length: ${COURSE_LISTING.length}`);
        });
    }

    /**
     * Adds the enrollment graph data to the above collections.
     * @param {IConfiguration} config The configuration information.
     */
    export async function initEnrollmentData(config: IConfiguration): Promise<void> {
        const ucsdInfo = config.ucsdInfo;
        const orgName = ucsdInfo.enrollDataOrgName;

        if (!orgName || ucsdInfo.githubTerms.length === 0) {
            return;
        }

        for await (const { term, repoName, ...o } of ucsdInfo.githubTerms) {
            const allOverallTerms = await GeneralUtilities.tryExecuteAsync<string[]>(async () => {
                const req = await DataRegistry.AXIOS.get<string>(
                    `https://raw.githubusercontent.com/${orgName}/${repoName}/main/all_courses.txt`
                );

                return req.data
                    .split("\n")
                    .map((x) => x.trim())
                    .filter((x) => x.length > 0);
            });

            if (allOverallTerms) {
                if (o.overall.reg) {
                    OVERALL_ENROLL.set(term, []);
                    for (const course of allOverallTerms) {
                        OVERALL_ENROLL.get(term)!.push({
                            fileName: course,
                            fileUrl: `https://raw.githubusercontent.com/${orgName}/${repoName}/main/plot_overall/${course}.png`,
                        });
                    }
                }

                if (o.overall.wide) {
                    // Overall (wide)
                    OVERALL_ENROLL_WIDE.set(term, []);
                    for (const course of allOverallTerms) {
                        OVERALL_ENROLL_WIDE.get(term)!.push({
                            fileName: course,
                            fileUrl: `https://raw.githubusercontent.com/${orgName}/${repoName}/main/plot_overall_wide/${course}.png`,
                        });
                    }
                }
            }
        }
    }

    /**
     * Gets all in-person meetings and classrooms. Each classroom is guaranteed to be valid (has a building 
     * and room number separated by a single space)
     * @returns {[IInternalCourseData[], string[]]} The in-person courses and classrooms.
     */
    export function getInPersonSectionsAndClassrooms(): [IInternalCourseData[], string[]] {
        return [ALL_IN_PERSON_MEETINGS, ALL_CLASSROOMS];
    }
}
