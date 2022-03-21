import {Bot} from "./Bot";
import {StringBuilder} from "./utilities/StringBuilder";
import {Collection} from "discord.js";
import {ICapeRow, IGitContent} from "./definitions";
import {GeneralUtilities} from "./utilities/GeneralUtilities";
import {createReadStream} from "fs";
import {createInterface} from "readline";
import * as path from "path";

export namespace Constants {
    export const OVERALL_ENROLL: Collection<string, IGitContent[]> = new Collection<string, IGitContent[]>();
    export const SECTION_ENROLL: Collection<string, IGitContent[]> = new Collection<string, IGitContent[]>();
    export const CAPE_DATA: ICapeRow[] = [];

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
                console.error("Bad line read.");
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
            console.info(`Done reading. Data length: ${CAPE_DATA.length}`);
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