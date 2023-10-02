import BaseCommand, { ICommandContext } from "../BaseCommand";
import { ScraperApiWrapper, StringUtil, TimestampType, TimeUtilities } from "../../utilities";
import { DataRegistry } from "../../DataRegistry";
import { EmbedBuilder } from "discord.js";
import * as table from "text-table";
import { EmojiConstants, GeneralConstants } from "../../Constants";

export default class LoginScriptStats extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "SCRAPER_STATS",
            formalCommandName: "Scraper Stats",
            botCommandName: "scraperstats",
            description: "Gets the overall scraper and login script statistics.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 3 * 1000,
            argumentInfo: [],
            guildOnly: false,
            botOwnerOnly: true,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        await ctx.interaction.deferReply();

        const [startTime, history, cse8aResponse] = await Promise.all([
            ScraperApiWrapper.getInstance().getLoginScriptStartTime(),
            ScraperApiWrapper.getInstance().getLoginScriptLoginHistory(),
            ScraperApiWrapper.getInstance().getCourseInfo(
                DataRegistry.CONFIG.ucsdInfo.currentWebRegTerms[0].term, "CSE", "8A")
        ]);

        const embed = new EmbedBuilder()
            .setColor("Random")
            .setTitle("WebReg API/Scraper Status");

        if (Array.isArray(cse8aResponse)) {
            embed.setDescription(`CSE 8A Query: ${EmojiConstants.GREEN_CHECK_EMOJI} Running`);
        }
        else {
            embed.setDescription(`CSE 8A Query: ${EmojiConstants.X_EMOJI} Not Running`);
        }

        if (!startTime) {
            embed.addFields({
                name: "Start Time",
                value: `${EmojiConstants.X_EMOJI} Unable to get login script start time`
            });
        }
        else if (typeof startTime === "object") {
            embed.addFields({
                name: "Start Time",
                value: `${EmojiConstants.X_EMOJI} Got API Error: ${startTime.error}`
            });
        }
        else {
            const startTimeStr = TimeUtilities.getDiscordTime({ time: startTime });
            const timeLeft = TimeUtilities.getDiscordTime({ 
                time: startTime + GeneralConstants.WEEK_TO_MS,
                style: TimestampType.Relative
            });

            embed.addFields({
                name: "Start Time",
                value: `- Started: ${startTimeStr}\n- Time Left: ${timeLeft}`
            });
        }

        if (!history) {
            embed.addFields({
                name: "Login Script Call Times",
                value: `${EmojiConstants.X_EMOJI} Unable to get login times`
            });
        }
        else if (!Array.isArray(history)) {
            embed.addFields({
                name: "Login Script Call Times",
                value: `${EmojiConstants.X_EMOJI} Got API Error: ${history.error}`
            });
        }
        else {
            embed.addFields({
                name: "Login Script Call Times",
                value: history.length > 0
                    ? history.map((x, i) => `- \`[${i + 1}]\` ${TimeUtilities.getDiscordTime({
                        time: x,
                        style: TimestampType.FullDate
                    })}`).join("\n")
                    : "N/A"
            });
        }

        for (const { term, termName } of DataRegistry.CONFIG.ucsdInfo.currentWebRegTerms) {
            const stats = await ScraperApiWrapper.getInstance().getRequestStatsForTerm(term);

            let value;
            if (!stats) {
                value = `${EmojiConstants.X_EMOJI} Unable to get scraper request statistics`;
            }
            else if ("error" in stats) {
                value = `${EmojiConstants.X_EMOJI} Got API Error: ${stats.error}`;
            }
            else if (stats.recent_requests.length === 0) {
                value = "No requests have been made yet";
            }
            else {
                const mean = stats.recent_requests.reduce((acc, curr) => acc + curr, 0) / stats.recent_requests.length;
                const squaredDiff = stats.recent_requests.map(x => (x - mean) ** 2);
                const variance = squaredDiff.reduce((acc, curr) => acc + curr, 0) / stats.recent_requests.length;
                value = StringUtil.codifyString(
                    table([
                        ["Avg Overall Time/Req", `${(stats.ttl_time_ms / stats.ttl_requests).toFixed(2)}ms`],
                        ["Total Reqs", stats.ttl_requests],
                        ["", ""],
                        ["Avg Recent Time/Req", `${mean.toFixed(2)}ms`],
                        ["Min Recent Time", `${Math.min(...stats.recent_requests)}ms`],
                        ["Max Recent Time", `${Math.max(...stats.recent_requests)}ms`],
                        ["Recent Req Variance", `${variance.toFixed(2)}`]
                    ])
                );
            }

            embed.addFields({
                name: `${termName}: Scraper Request Statistics`,
                value
            });
        }

        await ctx.interaction.editReply({
            embeds: [embed]
        });

        return 0;
    }
}
