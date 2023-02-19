// First, load all static data.
import * as fs from "fs";
import * as path from "path";
import { Data } from "./Data";

const content = fs.readFileSync(path.join(__dirname, "..", "config.production.json"));
const config: IConfiguration = JSON.parse(content.toString());
Data.initStaticData(config);

// Once we load all static data, then we can load the bot. The reason why is because
// loading the bot requires the data to be initialized, which requires us to run the
// above code first.
import { Bot } from "./Bot";
import { IConfiguration } from "./definitions";

(async () => {
    await Data.initEnrollmentData(config);
    const bot = new Bot(config.discord.token);
    bot.startAllEvents();
    await bot.login();
})();
