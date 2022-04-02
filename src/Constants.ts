import {Bot} from "./Bot";
import {StringBuilder} from "./utilities/StringBuilder";
import {Collection} from "discord.js";
import {ICapeRow, IGitContent, Meeting, WebRegSection} from "./definitions";
import {GeneralUtilities} from "./utilities/GeneralUtilities";
import {createReadStream} from "fs";
import {createInterface} from "readline";
import * as path from "path";
import {TimeUtilities} from "./utilities/TimeUtilities";

export namespace Constants {
    export const OVERALL_ENROLL: Collection<string, IGitContent[]> = new Collection<string, IGitContent[]>();
    export const SECTION_ENROLL: Collection<string, IGitContent[]> = new Collection<string, IGitContent[]>();
    export const CAPE_DATA: ICapeRow[] = [];

    export const SECTION_TERM_DATA: WebRegSection[] = [];
    export let TERM: string = "";

    /**
     * Adds the section data to the above array.
     * @param {string} term The term.
     * @param {string} [pathToFile] The path to the CAPE file, if any.
     */
    export function initSectionData(term: string, pathToFile?: string): void {
        TERM = term;

        const pathToRead = pathToFile ?? path.join(__dirname, "..", `${TERM}.tsv`);
        const readStream = createReadStream(pathToRead);
        const rl = createInterface(readStream);
        let firstLinePassed = false;
        rl.on("line", line => {
            if (!firstLinePassed) {
                firstLinePassed = true;
                return;
            }

            const rawData = line.split("\t");
            if (rawData.length !== 6) {
                console.error(`Bad line read for section data; got ${rawData.length} but expected 5.`);
                return;
            }

            const [
                subjCourseId,
                sectionCode,
                sectionId,
                instructor,
                totalSeats,
                meetings
            ] = rawData;

            const allMeetings: (Meeting | null)[] = meetings.split("|")
                .map(x => {
                    const meeting = x.split(",");
                    if (meeting.length !== 4) {
                        console.error(`Bad meeting read - ${sectionId}`);
                        return null;
                    }

                    const [
                        meetingType,
                        rawMeetingDays,
                        rawTimes,
                        rawLocation
                    ] = meeting;

                    // Parse meeting days first.
                    let meetingDays: string[] | string;
                    if (rawMeetingDays.includes("-")) {
                        meetingDays = rawMeetingDays;
                    }
                    else {
                        meetingDays = TimeUtilities.getAllDays(rawMeetingDays);
                    }

                    const times = rawTimes.split(/:| - /).map(x => Number.parseInt(x, 10));
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
                    } else if (splitLocation.length < 2) {
                        building = splitLocation[0];
                        console.warn(`Weird location - ${sectionId}`);
                    } else {
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
                        room
                    };
                });

            SECTION_TERM_DATA.push({
                available_seats: -1,
                enrolled_ct: -1,
                instructor: instructor.split(" & "),
                meetings: allMeetings.filter(x => x !== null) as Meeting[],
                needs_waitlist: false,
                section_code: sectionCode,
                section_id: sectionId,
                subj_course_id: subjCourseId,
                total_seats: Number.parseInt(totalSeats, 10),
                waitlist_ct: -1
            });
        });

        rl.on("close", () => {
            console.info(`Done reading SECTION. Data length: ${CAPE_DATA.length}`);
        });
    }

    /**
     * Adds the CAPE data to the above array.
     * @param {string} [pathToFile] The path to the CAPE file, if any.
     */
    export function initCapeData(pathToFile?: string): void {
        const pathToRead = pathToFile ?? path.join(__dirname, "..", "cape.tsv");
        const readStream = createReadStream(pathToRead);
        const rl = createInterface(readStream);

        let firstLinePassed = false;
        rl.on("line", line => {
            if (!firstLinePassed) {
                firstLinePassed = true;
                return;
            }

            const rawData = line.split("\t");
            if (rawData.length !== 11) {
                console.error(`Bad line read for CAPE data; got ${rawData.length} but expected 11.`)
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
                avgGradeRec
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
                averageGradeRec: Number.parseFloat(avgGradeRec)
            });
        });

        rl.on("close", () => {
            console.info(`Done reading CAPEs. Data length: ${CAPE_DATA.length}`);
        });
    }

    /**
     * Adds the enrollment graph data to the above collections.
     */
    export async function initEnrollmentData(): Promise<void> {
        const baseUrl = new StringBuilder()
            .append("https://api.github.com/repos/")
            .append(Bot.BotInstance.config.enrollData.repoOwner)
            .append("/")
            .append(Bot.BotInstance.config.enrollData.repoName)
            .append("/contents")
            .toString();

        for await (const term of Bot.BotInstance.config.enrollData.terms) {
            const overall = await GeneralUtilities.tryExecuteAsync<IGitContent[]>(async () => {
                const res = await Bot.AxiosClient.get(`${baseUrl}/${term}/plot_overall`, {
                    headers: {
                        "User-Agent": "rubot (ewang2002)"
                    }
                });
                return res.data;
            });

            if (overall) {
                OVERALL_ENROLL.set(term, overall.filter(x => x.name.endsWith(".png")));
            }
            else {
                console.error(`Could not get overall data for ${term}.`);
            }

            const section = await GeneralUtilities.tryExecuteAsync<IGitContent[]>(async () => {
                const res = await Bot.AxiosClient.get(`${baseUrl}/${term}/plot_section`, {
                    headers: {
                        "User-Agent": "rubot (ewang2002)"
                    }
                });
                return res.data;
            });

            if (section) {
                SECTION_ENROLL.set(term, section.filter(x => x.name.endsWith(".png")));
            }
            else {
                console.error(`Could not get section data for ${term}.`);
            }
        }
    }
}