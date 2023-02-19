import { Bot } from "./Bot";
import { IConfiguration } from "./definitions";
import * as fs from "fs";
import * as path from "path";
import { MutableConstants } from "./constants/MutableConstants";

(async () => {
    const content = fs.readFileSync(path.join(__dirname, "..", "config.production.json"));
    const config: IConfiguration = JSON.parse(content.toString());
    const bot = new Bot(config);
    bot.startAllEvents();
    MutableConstants.initCapeData();
    MutableConstants.initCourseListing();
    MutableConstants.initSectionData("WI23");
    if (config.isProd) {
        await MutableConstants.initEnrollmentData();
    }
    console.info("All data received.");
    await bot.login();
})();
