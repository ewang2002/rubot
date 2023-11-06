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
     * Insert a new course to remind into Postgres
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
     * Deletes a course 
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
            // const courses = getAllAlertCourses() to get list of courses to search thru 
            // find uniq courses in that list 
            // api calls on each unique course
            // for each course, search thru courses var (groupby? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy)
            //                  and send a notif to the right person/channel
            console.log("moshimoshi?");
            const courses = await getAllAlertCourses();
            //console.log(courses);

            const map: { [course: string]: CourseList } = {};
            for (const c of courses) {
                if (!(c.course in map)) {
                    map[c.course] = [];
                }
                if (c) {
                    map[c.course].push(c);
                }
            }
            console.log("map: ");
            //console.log(map);

            for (const course of Object.keys(map)) {
                const [subject, num] = course.split(" ");
                // const subject: string = course.slice(0, 2);
                // const num: string = course.slice(3, course.length);

                ScraperApiWrapper.getInstance().getCourseInfo(
                    DataRegistry.CONFIG.ucsdInfo.currentWebRegTerms[0].term, subject, num).then(async courseInfoList => {
                    // for each reminder found, we send an embed to remind the user
                    const userMap: { [channel_id: string]: string[] } = {};
                    console.log(DataRegistry.CONFIG.ucsdInfo.currentWebRegTerms[0].term);
                    console.log("subject" + subject);
                    console.log("num" + num);
                    //console.log("courseInfoList: ");
                    //console.log(courseInfoList);
                    // if courseInfoList has an error or is null
                    if (!courseInfoList || ("error" in courseInfoList)) {
                        GeneralUtilities.log("Course Info doesn't exist or error'd", "Scraper API Request", "ERROR");
                        return;
                    }
                    
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
                            console.log("user map: " + userMap);
                            console.log("user map2!!!! " + JSON.stringify(userMap));

                            // for each channel in userMap
                            for (const channelInfo in Object.keys(userMap)) {
                                const channel: TextChannel = client.channels.cache.get(channelInfo) as TextChannel;
                                // this no worky 
                                let userList = userMap.channelInfo;
                                console.log("user list");
                                console.log(userList);
                                userList = userList.map(i => "@" + i);

                                const courseEmbed = new EmbedBuilder()
                                    .setColor("DarkGreen")
                                    .setTitle("Course spot available!")
                                    .setDescription("There's at least one spot available for " + course)
                                    .setTimestamp();
                                
                                channel.send({
                                    content: "=======================================================\n" +
                                        `<${userList.toString()}>`, embeds: [courseEmbed]
                                });
                            }

                            break;
                        }
                    }
                });
            }


        }, seconds * 1000);
    }
}
