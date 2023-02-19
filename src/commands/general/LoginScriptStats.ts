import { BaseCommand, ICommandContext } from "../BaseCommand";
import { Bot } from "../../Bot";
import { GeneralUtilities } from "../../utilities/GeneralUtilities";
import { MutableConstants } from "../../constants/MutableConstants";
import { TERM_ARGUMENTS } from "../enroll-data/helpers/Helper";
import { StringBuilder } from "../../utilities/StringBuilder";
import { TimeUtilities } from "../../utilities/TimeUtilities";

export class LoginScriptStats extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "LOGIN_SCRIPT_STATS",
            formalCommandName: "Login Script Stats",
            botCommandName: "loginscriptstats",
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
            ctx.interaction.options.getString("term", false) ?? MutableConstants.DEFAULT_TERM;
        await ctx.interaction.deferReply();

        const startTime: number | { error: string } | null = await GeneralUtilities.tryExecuteAsync(
            async () => {
                // You will need the ucsd_webreg_rs app available
                const d = await Bot.AxiosClient.get(
                    `http://127.0.0.1:3000/scraper/login_script/${term}/start`
                );
                return d.data;
            }
        );

        const history: number[] | { error: string } | null = await GeneralUtilities.tryExecuteAsync(
            async () => {
                // You will need the ucsd_webreg_rs app available
                const d = await Bot.AxiosClient.get(
                    `http://127.0.0.1:3000/scraper/login_script/${term}/history`
                );
                return d.data;
            }
        );

        if (!startTime || !history) {
            await ctx.interaction.editReply({
                content: `An unknown error was encountered when requesting data for term **${term.toUpperCase()}**.`,
            });

            return -1;
        }

        if (typeof startTime === "object") {
            await ctx.interaction.editReply({
                content: `Error occurred when getting login start time for **${term.toUpperCase()}**: ${
                    startTime.error
                }`,
            });

            return -1;
        }

        if ("error" in history) {
            await ctx.interaction.editReply({
                content: `Error occurred when getting login history for **${term.toUpperCase()}**: ${
                    history.error
                }`,
            });

            return -1;
        }

        const msgContent = new StringBuilder()
            .append(`**Term:** **\`${term.toUpperCase()}\`**`)
            .appendLine()
            .append(`- Login Script Init: **\`${TimeUtilities.getDateTime(startTime)} PT\`**`)
            .append(" ")
            .append(
                `(**\`${TimeUtilities.formatDuration(
                    Date.now() - startTime,
                    false,
                    false
                )}\`** Ago)`
            )
            .appendLine()
            .append(`- Login Script Call History: Called **\`${history.length}\`** Times.`)
            .append("```")
            .appendLine();
        if (history.length > 0) {
            for (const data of history) {
                msgContent.append(`@ ${TimeUtilities.getDateTime(data)} PT`).appendLine();
            }
        } else {
            msgContent.append("N/A");
        }

        msgContent.append("```");

        await ctx.interaction.editReply({
            content: msgContent.toString(),
        });
        return 0;
    }
}
