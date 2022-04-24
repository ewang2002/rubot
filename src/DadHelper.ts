import * as fs from "fs";
import * as path from "path";
import {TimeUtilities} from "./utilities/TimeUtilities";

/**
 * Some functions & interfaces that are used to manage the members to track for responding to any messages containing
 * "i'm" or some variant.
 */
export namespace DadHelper {
    const DAD_JSON_PATH: string = path.join(__dirname, "..", "dad.json");
    // Array containing members that we should track. If someone says something that includes an `I'm` (or some
    // variant), if their ID is in this array, then we can respond appropriately.
    export const ALL_ACTIVE_TRACKERS: IDadTracker[] = [];

    const JSON_QUEUE: {
        obj: IDadTracker;
        resolver: (value: (boolean | PromiseLike<boolean>)) => void
    }[] = [];

    export interface IDadTracker {
        id: string;
        percent: number;
    }

    /**
     * Starts the dad queue checker.
     */
    export async function start(): Promise<void> {
        if (!fs.existsSync(DAD_JSON_PATH)) {
            await fs.promises.writeFile(DAD_JSON_PATH, JSON.stringify([]));
        }

        const jsonFile = await fs.promises.readFile(DAD_JSON_PATH);
        ALL_ACTIVE_TRACKERS.push(...JSON.parse(jsonFile.toString()));

        setInterval(async () => {
            if (JSON_QUEUE.length === 0) {
                return;
            }

            const {obj, resolver} = JSON_QUEUE.shift()!;
            const idx = ALL_ACTIVE_TRACKERS.findIndex(x => x.id === obj.id);

            // See if we can remove
            if (obj.percent === 0) {
                if (idx === -1) {
                    resolver(true);
                    console.info(`[${TimeUtilities.getDateTime()}] Attempted to remove ${obj.id} but not found.`);
                    return;
                }

                ALL_ACTIVE_TRACKERS.splice(idx, 1);
                await fs.promises.writeFile(DAD_JSON_PATH, JSON.stringify(ALL_ACTIVE_TRACKERS));
                resolver(true);
                console.info(`[${TimeUtilities.getDateTime()}] Removed user ${obj.id}.`);
                return;
            }

            if (idx === -1) {
                ALL_ACTIVE_TRACKERS.push(obj);
            }
            else {
                ALL_ACTIVE_TRACKERS[idx].percent = obj.percent;
            }

            await fs.promises.writeFile(DAD_JSON_PATH, JSON.stringify(ALL_ACTIVE_TRACKERS));
            resolver(true);
            console.info(`[${TimeUtilities.getDateTime()}] Saved user ${obj.id} with percent ${obj.percent}.`);
        }, 1000);
    }

    /**
     * Writes a single user & percent to the JSON file.
     * @param {IDadTracker} obj The user and percent to add.
     * @returns {Promise<boolean>} Whether this was successful.
     */
    export async function saveUserToJson(obj: IDadTracker): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            JSON_QUEUE.push({
                obj,
                resolver: resolve
            });
        });
    }
}