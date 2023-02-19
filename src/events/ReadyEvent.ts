import { Bot } from "../Bot";
import { Data } from "../Data";

export async function onReadyEvent(): Promise<void> {
    const botUser = Bot.BotInstance.client.user;

    // This should theoretically never hit.
    if (!botUser) {
        process.exit(1);
    }

    console.info(`${botUser.tag} has started successfully.`);
    console.info("\tMode: " + (Data.CONFIG.isProd ? "Production" : "Testing"));
}
