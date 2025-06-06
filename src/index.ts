import * as fs from "fs";
import * as path from "path";
import { DataRegistry } from "./DataRegistry";
import { Bot } from "./Bot";
import { IApiInfo, IConfiguration } from "./definitions";
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

// Create instance of scraper.
ScraperApiWrapper.getInstance();

const overrides: { [term: string]: IApiInfo } = {};
for (const termInfo of config.ucsdInfo.currentWebRegTerms) {
    if (!termInfo.apiOverride) {
        continue;
    }

    overrides[termInfo.term] = termInfo.apiOverride;
}

ScraperApiWrapper.init(
    config.ucsdInfo.apiBase, 
    config.ucsdInfo.apiKey,
    overrides
);

(async () => {
    await DataRegistry.initEverything(config);
    const bot = new Bot(config.discord.clientId, config.discord.token);
    bot.startAllEvents();

    if (config.discord.debugGuildIds.length === 0) {
        await bot.login();
    }
    else {
        await bot.login(config.discord.debugGuildIds);
    }
})();
