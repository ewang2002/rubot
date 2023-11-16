import { Pool, QueryResult } from "pg";
import {
    EmbedBuilder,
    TextChannel,
} from "discord.js";
import { Bot } from "../Bot";
import { GeneralUtilities } from "./GeneralUtilities";
import { DataRegistry } from "../DataRegistry";

type searchUserType = { id: number, message: string, alert_time: Date; }[]
type searchTimeType = { id: number, message: string, user_id: string, channel_id: string; }[]
type searchIDType = { message: string, alert_time: Date }[]

export namespace PostgresReminder {
    const pool = new Pool({
        user: DataRegistry.CONFIG.postgresInfo.user,
        password: DataRegistry.CONFIG.postgresInfo.password,
        host: DataRegistry.CONFIG.postgresInfo.host,
        port: DataRegistry.CONFIG.postgresInfo.port,
        database: DataRegistry.CONFIG.postgresInfo.database,
        ssl: DataRegistry.CONFIG.postgresInfo.ssl
    });
    
    /**
     * Create table in PostgreSQL to store alerts
     */
    export async function createAlertTable(): Promise<void> {
        try {
            const res = await pool.query(`
                CREATE SCHEMA IF NOT EXISTS "rubot";

                CREATE TABLE IF NOT EXISTS "rubot"."alert" (
                    "id" SERIAL PRIMARY KEY,
                    "user_id" text NOT NULL,
                    "message" text NOT NULL,
                    "alert_time" timestamp NOT NULL,
                    "channel_id" text NOT NULL
                );`
            );
            GeneralUtilities.log(res, createAlertTable.name, "INFO");
        }
        catch (err) {
            GeneralUtilities.log(err, createAlertTable.name, "ERROR");
        }
    }

    /**
     * Search *future* alerts via user information
     * @param {string} query The user's Discord ID
     * @returns {Promise<searchUserType>} Object w/ serial id, time to alert, and alert message
    */
    export async function searchByUser(query: string): Promise<searchUserType> {
        try {
            const res = await pool.query("SELECT id, message, alert_time FROM rubot.alert WHERE user_id = $1 AND alert_time >= now();", [query]);
            GeneralUtilities.log(res.rows, searchByUser.name, "INFO");

            return res.rows;
        }
        catch (err) {
            GeneralUtilities.log(err, searchByUser.name, "ERROR");
        }

        return [];
    }

    /**
     * Search for future alerts via serial id
     * @param {string | null} id The serial id of the alert 
     * @returns {Promise<searchIDType>} Object w/ time to alert and alert message
     */
    export async function searchByID(id: string | null): Promise<searchIDType> {
        try {
            const res = await pool.query("SELECT message, alert_time FROM rubot.alert WHERE id = $1 AND alert_time >= now();", [id]);
            GeneralUtilities.log(res, searchByID.name, "INFO");

            return res.rows;
        }
        catch (err) {
            GeneralUtilities.log(err, searchByID.name, "ERROR");
        }

        return [];
    }

    /**
     * Search for alerts via date (bucketed by minute)
     * @param {Date} query Datetime to search for
     * @returns {Promise<searchTimeType>} Object w/ serial id, message, user ID, and Discord channel ID
     */
    export async function searchByDate(query: Date): Promise<searchTimeType> {
        try {
            const res = await pool.query(`
            SELECT
                id,  
                message, 
                user_id,
                channel_id
            FROM rubot.alert
            WHERE alert_time >= date_trunc('minute', $1::timestamp) 
            AND   alert_time < date_trunc('minute', $1::timestamp) + INTERVAL '1 minute';`,
            [query]);

            return res.rows;
        }
        catch (err) {
            GeneralUtilities.log(err, searchByDate.name, "ERROR");
        }

        return [];
    }

    /**
     * Insert a new reminder into Postgres
     * @param {string} user Discord user ID
     * @param {string | null} message message add to db
     * @param {Date} alert_time time to alert the user
     * @param {string} channel_id id of Discord channel to send in
     */
    export async function insert(user: string, message: string | null, alert_time: Date, channel_id: string): Promise<void> {
        try {
            const res = await pool.query("INSERT INTO rubot.alert VALUES (DEFAULT, $1, $2, $3, $4);",
                [user, message, alert_time, channel_id]);
            GeneralUtilities.log(res, insert.name, "INFO");
        }
        catch (err) {
            GeneralUtilities.log(err, insert.name, "ERROR");
        }
    }

    /**
     * Ends pool of connections for Postgres
     */
    export async function end(): Promise<void> {
        await pool.end();
    }

    /**
     * Drops alert table if it exists
     */
    export async function dropAlertTable(): Promise<void> {
        try {
            const res = await pool.query("DROP TABLE IF EXISTS rubot.alert;");
            GeneralUtilities.log(res, dropAlertTable.name, "INFO");
        }
        catch (err) {
            GeneralUtilities.log(err, dropAlertTable.name, "ERROR");
        }
    }

    /**
     * Deletes a reminder 
     * @param {string} id serial id of the reminder to be deleted
     * @returns {Promise<QueryResult>} The information about the request
     */
    export async function deleteRow(id: string): Promise<QueryResult> {
        try {
            const res = await pool.query("DELETE FROM rubot.alert WHERE id = $1;", [id]);
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
        const SECONDS: number = 60;
        const client = Bot.BotInstance.client;

        setInterval(() => {
            // once you get the list of reminders, then create embed and send
            searchByDate(new Date()).then(async reminders => {
                // for each reminder found, we send an embed to remind the user
                for (const reminder of reminders) {
                    const channel: TextChannel = client.channels.cache.get(reminder.channel_id) as TextChannel;
                    const user = client.users.cache.get(reminder.user_id);

                    const remindEmbed = new EmbedBuilder()
                        .setColor("DarkGreen")
                        .setTitle("Reminder!")
                        .setDescription(`<@${reminder.user_id}>, your reminder: ${reminder.message}`)
                        .setTimestamp();
                    if (user) {
                        remindEmbed.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });
                    }
                    
                    channel.send({
                        content: "=======================================================\n" +
                            `<@${reminder.user_id}>`, embeds: [remindEmbed]
                    });
                }
            });
        }, SECONDS * 1000);
    }
}
