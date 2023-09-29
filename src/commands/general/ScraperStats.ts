import BaseCommand, { ICommandContext } from "../BaseCommand";
import { GeneralUtilities } from "../../utilities/GeneralUtilities";
import { DataRegistry } from "../../DataRegistry";
import { TERM_ARGUMENTS } from "../enroll-data/helpers/Helper";
import { TimestampType, TimeUtilities } from "../../utilities/TimeUtilities";
import { EmbedBuilder } from "discord.js";
import { ScraperTimeStatInfo } from "../../definitions";
import * as table from "text-table";
import { StringUtil } from "../../utilities/StringUtilities";

export default class LoginScriptStats extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "SCRAPER_STATS",
            formalCommandName: "Scraper Stats",
            botCommandName: "scraperstats",
            description: "Gets a term's stats (e.g., start time) from the scraper's login script.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 3 * 1000,
            argumentInfo: TERM_ARGUMENTS,
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const term =
            ctx.interaction.options.getString("term", false) ?? DataRegistry.DEFAULT_TERM;
        await ctx.interaction.deferReply();

        const [startTime, history, timeHistory]: [
            number | { error: string } | null,
            number[] | { error: string } | null,
            ScraperTimeStatInfo | { error: string } | null
        ] = await Promise.all([
            GeneralUtilities.tryExecuteAsync(
                async () => {
                    // You will need the ucsd_webreg_rs app available
                    const d = await DataRegistry.AXIOS.get(
                        `${DataRegistry.CONFIG.ucsdInfo.apiEndpoint}/scraper/login_script/${term}/start`
                    );
                    return d.data;
                }
            ),
            GeneralUtilities.tryExecuteAsync(
                async () => {
                    // You will need the ucsd_webreg_rs app available
                    const d = await DataRegistry.AXIOS.get(
                        `${DataRegistry.CONFIG.ucsdInfo.apiEndpoint}/scraper/login_script/${term}/history`
                    );
                    return d.data;
                }
            ),
            GeneralUtilities.tryExecuteAsync(
                async () => {
                    // You will need the ucsd_webreg_rs app available
                    const d = await DataRegistry.AXIOS.get(
                        `${DataRegistry.CONFIG.ucsdInfo.apiEndpoint}/scraper/timing_stats/${term}`
                    );
                    return d.data;
                }
            )
        ]);

        if (!startTime || !history) {
            await ctx.interaction.editReply({
                content: `An unknown error was encountered when requesting data for term **${term.toUpperCase()}**.`,
            });

            return -1;
        }

        if (typeof startTime === "object") {
            await ctx.interaction.editReply({
                content: `Error occurred when getting login start time for **${term.toUpperCase()}**: ${startTime.error}`,
            });

            return -1;
        }

        if ("error" in history) {
            await ctx.interaction.editReply({
                content: `Error occurred when getting login history for **${term.toUpperCase()}**: ${history.error}`,
            });

            return -1;
        }

        if (!timeHistory || "error" in timeHistory) {
            await ctx.interaction.editReply({
                content: `Error occurred when getting time history for **${term.toUpperCase()}**.`,
            });

            return -1;
        }

        const embed = new EmbedBuilder()
            .setColor("Random")
            .setTitle(`Scraper Status: ${term.toUpperCase()}`)
            .addFields({ name: "Login Time", value: TimeUtilities.getDiscordTime({ time: startTime }) })
            .addFields({
                name: "Login History",
                value: history.length > 0
                    ? history.map((x, i) => `@ \`[${i + 1}]\` ${TimeUtilities.getDiscordTime({ time: x, style: TimestampType.FullDate })}`)
                        .join("\n")
                    : "N/A"
            });

        // Get standard deviation
        if (timeHistory.recent_requests.length > 0) {
            const mean = timeHistory.recent_requests.reduce((acc, curr) => acc + curr, 0) / timeHistory.recent_requests.length;
            const squaredDiff = timeHistory.recent_requests.map(x => (x - mean) ** 2);
            const variance = squaredDiff.reduce((acc, curr) => acc + curr, 0) / timeHistory.recent_requests.length;

            embed.setDescription(StringUtil.codifyString(
                table([
                    ["Avg. Overall Time/Req", `${(timeHistory.ttl_time_ms / timeHistory.ttl_requests).toFixed(2)}ms.`],
                    ["Total Reqs", timeHistory.ttl_requests],
                    ["Avg. Recent Time/Req", `${mean.toFixed(2)}ms.`],
                    ["Recent Req. Variance", `${variance.toFixed(2)}`]
                ])
            ));
        }
        else {
            embed.setDescription("No additional information available.");
        }

        await ctx.interaction.editReply({
            embeds: [embed]
        });

        return 0;
    }
}
