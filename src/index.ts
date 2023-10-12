import * as fs from "fs";
import * as path from "path";
import { DataRegistry } from "./DataRegistry";
import { Bot } from "./Bot";
import { IConfiguration } from "./definitions";
import { ScraperApiWrapper } from "./utilities";
import { PostGresReminder } from "./utilities/PostGresReminder";

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

(async () => {
    // await PostGresReminder.createAlertTable();
    // PostGresReminder.end();

    await DataRegistry.initEnrollmentData(config);
    const bot = new Bot(config.discord.clientId, config.discord.token);
    bot.startAllEvents();

    // starts loop to check if we need to remind anyone 
    PostGresReminder.loop();

    if (config.discord.debugGuildIds.length === 0) {
        await bot.login();
    }
    else {
        await bot.login(config.discord.debugGuildIds);
    }
})();
