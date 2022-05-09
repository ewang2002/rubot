import {BaseCommand, ICommandContext} from "../BaseCommand";
import {MessageEmbed} from "discord.js";
import {TimeUtilities} from "../../utilities/TimeUtilities";
import {Bot} from "../../Bot";
import {WebRegSection} from "../../definitions";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {StringBuilder} from "../../utilities/StringBuilder";
import {Constants} from "../../Constants";
import {EmojiConstants} from "../../constants/GeneralConstants";
import WEBREG_TERMS = Constants.WEBREG_TERMS;
import {StringUtil} from "../../utilities/StringUtilities";
import * as table from "text-table";

export class Status extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "STATUS",
            formalCommandName: "Status",
            botCommandName: "status",
            description: "Gets the status of the bot.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 3 * 1000,
            argumentInfo: [],
            guildOnly: false,
            botOwnerOnly: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const uptime = TimeUtilities.formatDuration(
            Date.now() - Bot.BotInstance.instanceStarted.getTime(),
            true,
            false
        );

        await ctx.interaction.deferReply();
        const statusEmbed = new MessageEmbed()
            .setTitle("Bot Status")
            .setColor("DARK_GREEN")
            .setDescription(`Uptime: \`${uptime}\`\nLatency: \`${ctx.user.client.ws.ping}\`ms`)
            .setFooter({text: "Requested"})
            .setTimestamp();

        const webregStatus = new StringBuilder();
        for await (const data of WEBREG_TERMS) {
            const json: WebRegSection[] | {
                "error": string
            } | null = await GeneralUtilities.tryExecuteAsync(async () => {
                // You will need the ucsd_webreg_rs app available
                const d = await Bot.AxiosClient.get(`http://localhost:8000/course/${data.term}/CSE/8A`);
                return d.data;
            });

            webregStatus.append(data.paddedName).append(" ");
            if (!json || "error" in json) {
                webregStatus.append(EmojiConstants.X_EMOJI);
            }
            else {
                webregStatus.append(EmojiConstants.GREEN_CHECK_EMOJI);
            }

            webregStatus.appendLine();
            await GeneralUtilities.stopFor(500);
        }

        statusEmbed.addField("WebReg", StringUtil.codifyString(webregStatus.toString()));
        statusEmbed.addField("CAPE", StringUtil.codifyString(`${Constants.CAPE_DATA.length} Entries Loaded.`));
        statusEmbed.addField(
            `Cached Sections (${Constants.CACHED_DATA_TERM})`,
            StringUtil.codifyString(`${Constants.SECTION_TERM_DATA.length} Sections Loaded.`)
        );
        statusEmbed.addField(
            "Enrollment Graphs: Overall",
            StringUtil.codifyString(
                table([
                    ["Term", "General", "Wide", "FSP"],
                    ...Constants.GH_TERMS.map(x => {
                        let general = Constants.OVERALL_ENROLL.get(x.term)?.length ?? 0;
                        let wide = Constants.OVERALL_ENROLL_WIDE.get(x.term)?.length ?? 0;
                        let fsp = Constants.OVERALL_ENROLL_FSP.get(x.term)?.length ?? 0;

                        return [x.term, general, wide, fsp]
                    })
                ])
            )
        );
        statusEmbed.addField(
            "Enrollment Graphs: Section",
            StringUtil.codifyString(
                table([
                    ["Term", "General", "Wide", "FSP"],
                    ...Constants.GH_TERMS.map(x => {
                        let general = Constants.SECTION_ENROLL.get(x.term)?.length ?? 0;
                        let wide = Constants.SECTION_ENROLL_WIDE.get(x.term)?.length ?? 0;
                        let fsp = Constants.SECTION_ENROLL_FSP.get(x.term)?.length ?? 0;

                        return [x.term, general, wide, fsp]
                    })
                ])
            )
        );


        await ctx.interaction.editReply({
            embeds: [statusEmbed]
        });
        return 0;
    }
}