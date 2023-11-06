import { Pool, QueryResult } from "pg";
import {
    EmbedBuilder,
    TextChannel,
} from "discord.js";
import { Bot } from "../Bot";
import { GeneralUtilities } from "./GeneralUtilities";
import { DataRegistry } from "../DataRegistry";
import { ScraperApiWrapper } from "./ScraperApiWrapper";

type CourseList = { user_id: string, course: string, channel_id?: string; }[]

export namespace PostgresWatch {
    const pool = new Pool({
        user: DataRegistry.CONFIG.postgresInfo.user,
        password: DataRegistry.CONFIG.postgresInfo.password,
        host: DataRegistry.CONFIG.postgresInfo.host,
        port: DataRegistry.CONFIG.postgresInfo.port,
        database: DataRegistry.CONFIG.postgresInfo.database,
        ssl: DataRegistry.CONFIG.postgresInfo.ssl
    });

    /**
     * Create table in PostgreSQL to store courses to watch 
     */
    export async function createWatchTable(): Promise<void> {
        try {
            const res = await pool.query(`
                CREATE SCHEMA IF NOT EXISTS "rubot";

                CREATE TABLE IF NOT EXISTS "rubot"."watch" (
                    "user_id" text NOT NULL,
                    "course" text NOT NULL,
                    "channel_id" text NOT NULL
                );`
            );
            GeneralUtilities.log(res, createWatchTable.name, "INFO");
        }
        catch (err) {
            GeneralUtilities.log(err, createWatchTable.name, "ERROR");
        }
    }

    /**
     * Get list of classes given user_id and course
     * @param {string} user_id Discord user ID
     * @param {string} course 
     * @returns {Promise<CourseList>} List of Objects w/ class, user id
     */

    export async function searchCourse(user_id: string, course: string): Promise<CourseList> {
        try {
            const res = await pool.query(`
                SELECT user_id, course
                FROM rubot.watch 
                WHERE user_id = $1 AND course = $2;`, [user_id, course]);
            GeneralUtilities.log(res.rows, searchCourse.name, "INFO");

            return res.rows;
        }
        catch (err) {
            GeneralUtilities.log(err, searchCourse.name, "ERROR");
        }

        return [];
    }

    /**
     * Get list of classes that could be alerted on
     * @returns {Promise<CourseList>} List of Objects w/ class, user id, and channel id
     */

    export async function getAllAlertCourses(): Promise<CourseList> {
        try {
            const res = await pool.query(`
                SELECT user_id, 
                       course, 
                       channel_id
                FROM rubot.watch;`);
            GeneralUtilities.log(res.rows, getAllAlertCourses.name, "INFO");

            return res.rows;
        }
        catch (err) {
            GeneralUtilities.log(err, getAllAlertCourses.name, "ERROR");
        }

        return [];
    }

    /**
     * Insert a new course to remind for into Postgres
     * @param {string} user_id Discord user ID
     * @param {string} course class to alert for
     * @param {string} channel_id id of Discord channel to send in
     */
    export async function insertClass(user_id: string, course: string, channel_id: string): Promise<void> {
        try {
            const res = await pool.query("INSERT INTO rubot.watch VALUES ($1, $2, $3);",
                [user_id, course, channel_id]);

            GeneralUtilities.log(res, insertClass.name, "INFO");
        }
        catch (err) {
            GeneralUtilities.log(err, insertClass.name, "ERROR");
        }
    }

    /**
     * Drops course table if it exists
     */
    export async function dropCourseTable(): Promise<void> {
        try {
            const res = await pool.query("DROP TABLE IF EXISTS rubot.watch;");
            GeneralUtilities.log(res, dropCourseTable.name, "INFO");
        }
        catch (err) {
            GeneralUtilities.log(err, dropCourseTable.name, "ERROR");
        }
    }

    /**
     * Deletes a course from a user
     * @param {string} user_id user_id of the person wanting to delete
     * @param {string} course course to remove
     * @returns {Promise<QueryResult>} The information about the request
     */
    export async function deleteRow(user_id: string, course: string): Promise<QueryResult> {
        try {
            const res = await pool.query("DELETE FROM rubot.watch WHERE user_id = $1 AND course = $2;", [user_id, course]);
            GeneralUtilities.log(res, deleteRow.name, "INFO");

            return res;
        }
        catch (err) {
            GeneralUtilities.log(err, deleteRow.name, "ERROR");
        }
        return {
            command: "DELETE",
            rowCount: 1,
            oid: 0,
            rows: [],
            fields: [],
        };
    }

    /**
     * Every minute, search for alerts that need to be sent now. Send if found. 
     */
    export function loop() {
        // call function every minute
        const seconds = 60;
        const client = Bot.BotInstance.client;

        setInterval(async () => {
            // list of courses/users/channels that we could potentially alert on
            const courses = await getAllAlertCourses();

            // create a grouped map of course: object
            const map: { [course: string]: CourseList } = {};
            for (const c of courses) {
                if (!(c.course in map)) {
                    map[c.course] = [];
                }
                if (c) {
                    map[c.course].push(c);
                }
            }

            // for each course that could be alerted on, make an API call to see if seats are open
            for (const course of Object.keys(map)) {
                const [subject, num] = course.split(" ");

                ScraperApiWrapper.getInstance().getCourseInfo(
                    DataRegistry.CONFIG.ucsdInfo.currentWebRegTerms[0].term, subject, num).then(async courseInfoList => {
                    const userMap: { [channel_id: string]: string[] } = {};

                    // if courseInfoList has an error or is null
                    if (!courseInfoList || ("error" in courseInfoList)) {
                        GeneralUtilities.log("Course Info doesn't exist or error'd", "Scraper API Request", "ERROR");
                        return;
                    }
                    
                    // for every section of the course in webreg
                    for (const section of courseInfoList) {
                        // if there's a section open
                        if (section.available_seats > 0 && section.waitlist_ct <= 0 && section.is_visible) {
                            // create a map of channel ids to a list of users
                            for (const { user_id, channel_id } of map[course]) {
                                if (channel_id && !(channel_id in userMap)) {
                                    userMap[channel_id] = [];
                                }
                                if (channel_id && user_id) {
                                    userMap[channel_id].push(user_id);
                                }
                            }

                            // for each channel in userMap, notify every person for the class in that channel
                            for (const channelInfo of Object.keys(userMap)) {
                                const channel: TextChannel = client.channels.cache.get(channelInfo) as TextChannel;
                                let userList = userMap[channelInfo];
                                userList = userList.map(i => "<@" + i + "> ");

                                const courseEmbed = new EmbedBuilder()
                                    .setColor("DarkGreen")
                                    .setTitle("Course spot available!")
                                    .setDescription("There's at least one spot available for " + course)
                                    .setTimestamp();
                                
                                channel.send({
                                    content: "=======================================================\n" +
                                        `${userList.toString()}`, embeds: [courseEmbed]
                                });
                            }
                            break;
                        }
                    }
                    // wait a second between API requests 
                    GeneralUtilities.stopFor(1000);
                });
            }
        }, seconds * 1000);
    }
}
