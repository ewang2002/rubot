import {Bot} from "./Bot";
import {IConfiguration} from "./definitions";
import * as fs from "fs";
import * as path from "path";
import {StringBuilder} from "./utilities/StringBuilder";
import {TimeUtilities} from "./utilities/TimeUtilities";
import {Constants} from "./Constants";

(async () => {
    const content = fs.readFileSync(path.join(__dirname, "..", "config.json"));
    const config: IConfiguration = JSON.parse(content.toString());
    const bot = new Bot(config);
    bot.startAllEvents();
    Constants.initCapeData();
    Constants.initSectionData("SP22");
    if (config.isProd) {
        await Constants.initEnrollmentData();
    }
    console.info("All data received.");
    await bot.login();
})();

process.on("unhandledRejection", e => {
    console.error(
        new StringBuilder()
            .append(`[${TimeUtilities.getDateTime(Date.now(), "America/Los_Angeles")}] ${e}`)
            .appendLine()
            .append("=====================================")
            .toString()
    );
});