// First, load all static data.
import * as fs from "fs";
import * as path from "path";
import { DataRegistry } from "./DataRegistry";
import { Bot } from "./Bot";
import { IConfiguration } from "./definitions";

const content = fs.readFileSync(path.join(__dirname, "..", "config.production.json"));
const config: IConfiguration = JSON.parse(content.toString());
DataRegistry.initStaticData(config);
(async () => {
    await DataRegistry.initEnrollmentData(config);
    const bot = new Bot(config.discord.clientId, config.discord.token);
    bot.startAllEvents();
    await bot.login();
})();