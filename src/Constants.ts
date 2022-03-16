import {Bot} from "./Bot";
import {StringBuilder} from "./utilities/StringBuilder";
import {Collection} from "discord.js";
import {IGitContent} from "./definitions/GitContents";
import {GeneralUtilities} from "./utilities/GeneralUtilities";

export namespace Constants {
    export const OVERALL_ENROLL: Collection<string, IGitContent[]> = new Collection<string, IGitContent[]>();
    export const SECTION_ENROLL: Collection<string, IGitContent[]> = new Collection<string, IGitContent[]>();

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