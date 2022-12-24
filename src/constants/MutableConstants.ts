import { Collection } from "discord.js";
import { ICapeRow, IPlotInfo, ListedCourse, Meeting, WebRegSection } from "../definitions";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import * as path from "path";
import { TimeUtilities } from "../utilities/TimeUtilities";
import { AxiosRequestConfig } from "axios";
import { Bot } from "../Bot";
import { GeneralUtilities } from "../utilities/GeneralUtilities";

export namespace MutableConstants {
    export const ENROLL_DATA_GH: string = "https://github.com/ewang2002/UCSDHistEnrollData";

    // All active webreg terms (accessible on the rocket web server)
    export const WEBREG_TERMS: {
        term: string;
        termName: string;
        paddedName: string;
    }[] = [
            // Default term should be the first one.
            {
                term: "WI23",
                termName: "Winter 2023",
                paddedName: "Winter 2023            "
            }
        ];

    export const DEFAULT_TERM: string = MutableConstants.WEBREG_TERMS[0].term;

    // Terms that we have github data for.
    export const GH_TERMS: {
        term: string;
        termName: string;
        repoName: string;
        overall: {
            reg: boolean;
            fsp: boolean;
            wide: boolean;
        };
        section: {
            reg: boolean;
            fsp: boolean;
            wide: boolean;
        };
    }[] = [
        {
            term: "SP22",
            termName: "Spring 2022",
            repoName: "2022Spring",
            overall: {
                reg: true,
                fsp: true,
                wide: true
            },
            section: {
                reg: true,
                fsp: true,
                wide: true
            }
        },
        {
            term: "SP22D",
            termName: "Spring 2022 (Post-Enrollment)",
            repoName: "2022SpringDrop",
            overall: {
                reg: true,
                fsp: false,
                wide: false
            },
            section: {
                reg: true,
                fsp: false,
                wide: false
            }
        },
        {
            term: "S122",
            termName: "Summer Session I 2022",
            repoName: "2022Summer1",
            overall: {
                reg: true,
                fsp: false,
                wide: false
            },
            section: {
                reg: true,
                fsp: false,
                wide: false
            }
        },
        {
            term: "S122D",
            termName: "Summer Session I 2022 (Post-Enrollment)",
            repoName: "2022Summer1Drop",
            overall: {
                reg: true,
                fsp: false,
                wide: false
            },
            section: {
                reg: true,
                fsp: false,
                wide: false
            }
        },
        {
            term: "S222",
            termName: "Summer Session II 2022",
            repoName: "2022Summer2",
            overall: {
                reg: true,
                fsp: false,
                wide: false
            },
            section: {
                reg: true,
                fsp: false,
                wide: false
            }
        },
        {
            term: "S222D",
            termName: "Summer Session II 2022 (Post-Enrollment)",
            repoName: "2022Summer2Drop",
            overall: {
                reg: true,
                fsp: false,
                wide: false
            },
            section: {
                reg: true,
                fsp: false,
                wide: false
            }
        },
        {
            term: "FA22G",
            termName: "Fall 2022 (Graduate)",
            repoName: "2022FallGrad",
            overall: {
                reg: true,
                fsp: false,
                wide: true
            },
            section: {
                reg: true,
                fsp: false,
                wide: true
            }
        },
        {
            term: "FA22",
            termName: "Fall 2022 (Undergraduate)",
            repoName: "2022Fall",
            overall: {
                reg: true,
                fsp: false,
                wide: true
            },
            section: {
                reg: true,
                fsp: false,
                wide: true
            }
        },
        {
            term: "WI23G",
            termName: "Winter 2023 (Graduate)",
            repoName: "2023WinterGrad",
            overall: {
                reg: true,
                fsp: false,
                wide: false
            },
            section: {
                reg: true,
                fsp: false,
                wide: false
            }
        },
        {
            term: "WI23",
            termName: "Winter 2023 (Undergraduate)",
            repoName: "2023Winter",
            overall: {
                reg: true,
                fsp: false,
                wide: false
            },
            section: {
                reg: true,
                fsp: false,
                wide: false
            }
        }
    ].reverse();

    export const OVERALL_ENROLL: Collection<string, IPlotInfo[]> = new Collection<string, IPlotInfo[]>();
    export const OVERALL_ENROLL_WIDE: Collection<string, IPlotInfo[]> = new Collection<string, IPlotInfo[]>();
    export const OVERALL_ENROLL_FSP: Collection<string, IPlotInfo[]> = new Collection<string, IPlotInfo[]>();
    export const SECTION_ENROLL: Collection<string, IPlotInfo[]> = new Collection<string, IPlotInfo[]>();
    export const SECTION_ENROLL_WIDE: Collection<string, IPlotInfo[]> = new Collection<string, IPlotInfo[]>();
    export const SECTION_ENROLL_FSP: Collection<string, IPlotInfo[]> = new Collection<string, IPlotInfo[]>();
    export const CAPE_DATA: ICapeRow[] = [];
    export const SECTION_TERM_DATA: WebRegSection[] = [];
    export const COURSE_LISTING: ListedCourse[] = [];
    export const LISTING_LAST_SCRAPED: string = "August 10, 2022";

    // Term that we have section (cached) data for. We should only have one active term at any point.
    export let CACHED_DATA_TERM: string = "";

    /**
     * Adds the section data to the above array.
     * @param {string} term The term.
     * @param {string} [pathToFile] The path to the section file, if any.
     */
    export function initSectionData(term: string, pathToFile?: string): void {
        CACHED_DATA_TERM = term;

        const pathToRead = pathToFile ?? path.join(__dirname, "..", "..", `${CACHED_DATA_TERM}.tsv`);
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
                        room
                    };
                });

            SECTION_TERM_DATA.push({
                available_seats: -1,
                enrolled_ct: -1,
                all_instructors: instructor.split(" & "),
                meetings: allMeetings.filter(x => x !== null) as Meeting[],
                needs_waitlist: false,
                section_code: sectionCode,
                section_id: sectionId,
                subj_course_id: subjCourseId,
                total_seats: Number.parseInt(totalSeats, 10),
                waitlist_ct: -1,
                is_visible: false,
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
        const pathToRead = pathToFile ?? path.join(__dirname, "..", "..", "cape.tsv");
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
     * Adds the course listing data to the above array.
     * @param {string} pathToFile The path to the course listing file, if any.
     */
    export function initCourseListing(pathToFile?: string): void {
        const pathToRead = pathToFile ?? path.join(__dirname, "..", "..", "courses.tsv");
        const readStream = createReadStream(pathToRead);
        const rl = createInterface(readStream);

        let firstLinePassed = false;
        rl.on("line", line => {
            if (!firstLinePassed) {
                firstLinePassed = true;
                return;
            }

            const rawData = line.split("\t");
            if (rawData.length !== 5) {
                console.error(`Bad line read for course listing data; got ${rawData.length} but expected 5.`)
                return;
            }

            const [
                department,
                subjCourse,
                courseName,
                units,
                description
            ] = rawData;

            COURSE_LISTING.push({
                department,
                courseName,
                subjCourse,
                units,
                description
            });
        });

        rl.on("close", () => {
            console.info(`Done reading course listing. Data length: ${COURSE_LISTING.length}`);
        });
    }

    /**
     * Adds the enrollment graph data to the above collections.
     */
    export async function initEnrollmentData(): Promise<void> {
        const requestHeader: AxiosRequestConfig = {
            headers: {
                "User-Agent": "rubot (ewang2002)"
            }
        };

        for await (const { term, repoName, ...o } of GH_TERMS) {
            const allOverallTerms = await GeneralUtilities.tryExecuteAsync<string[]>(async () => {
                const req = await Bot.AxiosClient.get<Buffer>(
                    `https://raw.githubusercontent.com/${Bot.BotInstance.config.enrollDataOrgName}/${repoName}/main/all_courses.txt`,
                    {
                        responseType: "arraybuffer"
                    }
                );

                return req.data.toString("utf16le").split("\n").map(x => x.trim()).filter(x => x.length > 0);
            });

            if (allOverallTerms) {
                if (o.overall.reg) {
                    OVERALL_ENROLL.set(term, []);
                    for (const course of allOverallTerms) {
                        OVERALL_ENROLL.get(term)!.push({
                            fileName: course,
                            fileUrl: `https://raw.githubusercontent.com/${Bot.BotInstance.config.enrollDataOrgName}/${repoName}/main/plot_overall/${course}.png`
                        });
                    }
                }


                if (o.overall.fsp) {
                    // Overall (first/second pass)
                    OVERALL_ENROLL_FSP.set(term, []);
                    for (const course of allOverallTerms) {
                        OVERALL_ENROLL_FSP.get(term)!.push({
                            fileName: course,
                            fileUrl: `https://raw.githubusercontent.com/${Bot.BotInstance.config.enrollDataOrgName}/${repoName}/main/plot_overall_fsp/${course}.png`
                        });
                    }
                }


                if (o.overall.wide) {
                    // Overall (wide)
                    OVERALL_ENROLL_WIDE.set(term, []);
                    for (const course of allOverallTerms) {
                        OVERALL_ENROLL_WIDE.get(term)!.push({
                            fileName: course,
                            fileUrl: `https://raw.githubusercontent.com/${Bot.BotInstance.config.enrollDataOrgName}/${repoName}/main/plot_overall_wide/${course}.png`
                        });
                    }
                }
            }

            const allSectionTerms = await GeneralUtilities.tryExecuteAsync<string[]>(async () => {
                const req = await Bot.AxiosClient.get<Buffer>(
                    `https://raw.githubusercontent.com/${Bot.BotInstance.config.enrollDataOrgName}/${repoName}/main/all_sections.txt`,
                    {
                        responseType: "arraybuffer"
                    }
                );

                return req.data.toString("utf16le").split("\n").map(x => x.trim()).filter(x => x.length > 0);
            });

            if (allSectionTerms) {
                if (o.section.reg) {
                    SECTION_ENROLL.set(term, []);
                    for (const sec of allSectionTerms) {
                        SECTION_ENROLL.get(term)!.push({
                            fileName: sec,
                            fileUrl: `https://raw.githubusercontent.com/${Bot.BotInstance.config.enrollDataOrgName}/${repoName}/main/plot_section/${sec}.png`
                        });
                    }
                }


                if (o.section.fsp) {
                    // Section (first/second pass)
                    SECTION_ENROLL_FSP.set(term, []);
                    for (const sec of allSectionTerms) {
                        SECTION_ENROLL_FSP.get(term)!.push({
                            fileName: sec,
                            fileUrl: `https://raw.githubusercontent.com/${Bot.BotInstance.config.enrollDataOrgName}/${repoName}/main/plot_section_fsp/${sec}.png`
                        });
                    }
                }


                if (o.section.wide) {
                    // Section (wide)
                    SECTION_ENROLL_WIDE.set(term, []);
                    for (const sec of allSectionTerms) {
                        SECTION_ENROLL_WIDE.get(term)!.push({
                            fileName: sec,
                            fileUrl: `https://raw.githubusercontent.com/${Bot.BotInstance.config.enrollDataOrgName}/${repoName}/main/plot_section_wide/${sec}.png`
                        });
                    }
                }
            }
        }
    }
}