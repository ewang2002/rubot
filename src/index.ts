import * as fs from "fs";
import * as path from "path";
import { DataRegistry } from "./DataRegistry";
import { Bot } from "./Bot";
import { IConfiguration } from "./definitions";
import { ScraperApiWrapper } from "./utilities";

let configName = "config.production.json";
if (process.argv.length > 0) {
    const proposed = process.argv.at(-1)!;
    if (proposed.endsWith(".json")) {
        configName = proposed;
    }
}

const content = fs.readFileSync(path.join(__dirname, "..", configName));
const config: IConfiguration = JSON.parse(content.toString());
DataRegistry.initStaticData(config);

// Create instance of scraper.
ScraperApiWrapper.getInstance();
ScraperApiWrapper.init(config.ucsdInfo.apiBase, config.ucsdInfo.apiKey);
import { PostgresReminder } from "./utilities/PostgresReminder";
import { PostgresWatch } from "./utilities/PostgresWatch";

(async () => {
    await DataRegistry.initEnrollmentData(config);
    const bot = new Bot(config.discord.clientId, config.discord.token);
    bot.startAllEvents();

    if (config.discord.debugGuildIds.length === 0) {
        await bot.login();
    }
    else {
        await bot.login(config.discord.debugGuildIds);
    }

    // starts loop to check if we need to remind anyone about classes/reminders
    PostgresReminder.loop();
    PostgresWatch.loop();
})();
