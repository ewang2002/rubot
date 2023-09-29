import * as fs from "fs";
import * as path from "path";
import { DataRegistry } from "./DataRegistry";
import { Bot } from "./Bot";
import { IConfiguration } from "./definitions";
import { ScraperApiWrapper } from "./utilities";

const content = fs.readFileSync(path.join(__dirname, "..", "config.production.json"));
const config: IConfiguration = JSON.parse(content.toString());
DataRegistry.initStaticData(config);

// Create instance of scraper.
ScraperApiWrapper.getInstance();
ScraperApiWrapper.init(config.ucsdInfo.apiBase, config.ucsdInfo.apiKey);

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
})();
