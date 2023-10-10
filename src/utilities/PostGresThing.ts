import { Pool } from "pg";

const pool = new Pool({
    user: "postgres",
    password: "a",
});
 
type queryType = "user" | "time";

export namespace PostGresThing {
    export async function createAlertTable () {
        try {
            const res = await pool.query(`
                CREATE SCHEMA IF NOT EXISTS "rubot";

                CREATE TABLE IF NOT EXISTS "rubot"."to_alert" (
                    "user_id" text NOT NULL,
                    "message" text NOT NULL,
                    "alert_time" timestamp PRIMARY KEY NOT NULL
                );`
            );
            console.log(res);
        } 
        catch (err) {
            console.error(err);
        }
    }

    export async function search (query:string | Date, type:queryType): Promise<{ message: string, alert_time: Date; }[]> {
        try {
            let res;
            if (type === "user") {
                res = await pool.query("SELECT message, alert_time FROM rubot.to_alert WHERE user_id = $1;", [query]);
            }
            else { // search via time (in minute increments) 
                res = await pool.query(`
                SELECT 
                    message, 
                    user_id
                FROM rubot.to_alert
                WHERE alert_time >= date_trunc('minute', $1::timestamp) 
                AND   alert_time < date_trunc('minute', $1::timestamp) + INTERVAL '1 minute';`, 
                [query]);
            }
            console.log("search");
            console.log(res.rows); 

            return res.rows;
        } 
        catch (err) {
            console.error(err);
        }

        return [];
    }

    export async function insert (user:string, message:string | null, alert_time:Date) {
        try {
            const res = await pool.query("INSERT INTO rubot.to_alert VALUES ($1, $2, $3);", [user, message, alert_time]);
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
            const res = await pool.query("DROP TABLE IF EXISTS rubot.to_alert;");
            console.log(res); 
            
        } 
        catch (err) {
            console.error(err);
        } 
    }

}
