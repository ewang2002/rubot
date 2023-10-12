import { Pool } from "pg";
import {
    EmbedBuilder,
    TextChannel,
} from "discord.js";
import { Bot } from "../Bot";
import { lstat } from "fs";

const pool = new Pool({
    user: "postgres",
    password: "a",
});
 
type SearchUserType = { id: number, message: string, alert_time: Date; }[] 
type SearchTimeType = { id: number, message: string, user_id: string, channel_id: string; }[]

export namespace PostGresReminder {
    // creates table for storing alerts 
    export async function createAlertTable () {
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
            console.log(res);
        } 
        catch (err) {
            console.error(err);
        }
    }

    // search via user 
    export async function searchByUser (query:string): Promise<SearchUserType> {
        try {
            const res = await pool.query("SELECT id, message, alert_time FROM rubot.alert WHERE user_id = $1;", [query]);
            console.log("search by user");
            console.log(res.rows); 

            return res.rows;
        }
        catch (err) {
            console.error(err);
        }
        
        return [];
    }

    // search via date (in minute increments)
    export async function searchByDate (query: Date): Promise<SearchTimeType> {
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

            console.log("search by time");
            console.log(res.rows); 

            return res.rows;
        } 
        catch (err) {
            console.error(err);
        }

        return [];
    }

    export async function insert (user:string, message:string | null, alert_time:Date, channel_id:string) {
        try {
            const res = await pool.query("INSERT INTO rubot.alert VALUES (DEFAULT, $1, $2, $3, $4);", 
                [user, message, alert_time, channel_id]);
            console.log("insert");
            console.log(res); 
            
        } 
        catch (err) {
            console.error(err);
        } 
    }

    export async function end () {
        await pool.end();
    }

    export async function dropAlertTable () {
        try {
            const res = await pool.query("DROP TABLE IF EXISTS rubot.alert;");
            console.log(res); 
            
        } 
        catch (err) {
            console.error(err);
        } 
    }

    export function loop () {
        const seconds = 60; // call function every minute
        const client = Bot.BotInstance.client;

        setInterval(async () => {
            // list of reminders from db search 
            const reminders = await searchByDate(new Date());

            if (reminders.length > 0) {
                console.log((new Date()).toDateString);
                console.log(reminders);

                for (const reminder of reminders) {
                    if ("user_id" in reminder && "channel_id" in reminder) {
                        const channel: TextChannel = client.channels.cache.get(reminder.channel_id) as TextChannel;
                        const user = client.users.cache.get(reminder.user_id);

                        let remindEmbed = new EmbedBuilder()
                            .setColor("DarkGreen")
                            .setTitle("Reminder!")
                            .setDescription(`<@${reminder.user_id}>, your reminder: ${reminder.message}`)
                            .setTimestamp();
                        if (user) {
                            remindEmbed.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });
                        }
                        channel.send({ content: "=======================================================\n" + 
                        `<@${reminder.user_id}>`, embeds: [remindEmbed] });
                    }
                }
            }
        }, seconds * 1000); 
    }
}
