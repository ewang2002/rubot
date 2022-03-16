import {Bot} from "../Bot";

export async function onReadyEvent(): Promise<void> {
    const botUser = Bot.BotInstance.client.user;

    // This should theoretically never hit.
    if (!botUser) {
        process.exit(1);
    }

    console.info(`${botUser.tag} events have started successfully.`);
}