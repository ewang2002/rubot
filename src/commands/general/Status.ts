import BaseCommand, { ICommandContext } from "../BaseCommand";
import { EmbedBuilder } from "discord.js";
import { TimeUtilities } from "../../utilities/TimeUtilities";
import { Bot } from "../../Bot";
import { WebRegSection } from "../../definitions";
import { GeneralUtilities } from "../../utilities/GeneralUtilities";
import { StringBuilder } from "../../utilities/StringBuilder";
import { Data } from "../../Data";
import { EmojiConstants } from "../../Constants";
import { StringUtil } from "../../utilities/StringUtilities";
import * as table from "text-table";

export default class Status extends BaseCommand {
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
            botOwnerOnly: false,
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
        const statusEmbed = new EmbedBuilder()
            .setTitle("Bot Status")
            .setColor("DarkGreen")
            .setDescription(`Uptime: \`${uptime}\`\nLatency: \`${ctx.user.client.ws.ping}\`ms`)
            .setFooter({ text: "Requested" })
            .setTimestamp();

        const webregStatus = new StringBuilder();
        for await (const data of Data.CONFIG.ucsdInfo.currentWebRegTerms) {
            const json: WebRegSection[] | { error: string; } | null = await GeneralUtilities.tryExecuteAsync(async () => {
                // You will need the ucsd_webreg_rs app available
                const d = await Data.AXIOS.get(
                    `${Data.CONFIG.ucsdInfo.apiEndpoint}/webreg/course_info/${data.term}?subject=CSE&number=8A`
                );
                return d.data;
            });

            webregStatus.append(data.term).append(" - ");
            if (!json || "error" in json) {
                webregStatus.append(EmojiConstants.X_EMOJI);
            }
            else {
                webregStatus.append(EmojiConstants.GREEN_CHECK_EMOJI);
            }

            webregStatus.appendLine();
            await GeneralUtilities.stopFor(500);
        }

        statusEmbed.addFields({
            name: "WebReg",
            value: StringUtil.codifyString(webregStatus.toString())
        });
        statusEmbed.addFields({
            name: "CAPE",
            value: StringUtil.codifyString(`${Data.CAPE_DATA.length} Entries Loaded.`)
        });
        statusEmbed.addFields({
            name: "Course Listings",
            value: StringUtil.codifyString(`${Data.COURSE_LISTING.length} Courses Loaded.`)
        });
        statusEmbed.addFields({
            name: `Cached Sections (${Data.CONFIG.ucsdInfo.miscData.currentTermData.term})`,
            value: StringUtil.codifyString(`${Data.SECTION_TERM_DATA.length} Sections Loaded.`)
        });
        statusEmbed.addFields({
            name: "Enrollment Graphs: Overall",
            value: StringUtil.codifyString(
                table([
                    ["Term", "General", "Wide"],
                    ...Data.CONFIG.ucsdInfo.githubTerms.map((x) => {
                        const general = Data.OVERALL_ENROLL.get(x.term)?.length ?? 0;
                        const wide = Data.OVERALL_ENROLL_WIDE.get(x.term)?.length ?? 0;

                        return [x.term, general, wide];
                    }),
                ])
            )
        });
        statusEmbed.addFields({
            name: "Enrollment Graphs: Section",
            value: StringUtil.codifyString(
                table([
                    ["Term", "General", "Wide"],
                    ...Data.CONFIG.ucsdInfo.githubTerms.map((x) => {
                        const general = Data.SECTION_ENROLL.get(x.term)?.length ?? 0;
                        const wide = Data.SECTION_ENROLL_WIDE.get(x.term)?.length ?? 0;

                        return [x.term, general, wide];
                    }),
                ])
            )
        });

        await ctx.interaction.editReply({
            embeds: [statusEmbed],
        });
        return 0;
    }
}
