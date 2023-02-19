import { BaseCommand, ICommandContext } from "../BaseCommand";
import { EmbedBuilder } from "discord.js";
import { TimeUtilities } from "../../utilities/TimeUtilities";
import { Bot } from "../../Bot";
import { WebRegSection } from "../../definitions";
import { GeneralUtilities } from "../../utilities/GeneralUtilities";
import { StringBuilder } from "../../utilities/StringBuilder";
import { MutableConstants } from "../../constants/MutableConstants";
import { EmojiConstants } from "../../constants/GeneralConstants";
import WEBREG_TERMS = MutableConstants.WEBREG_TERMS;
import { StringUtil } from "../../utilities/StringUtilities";
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
        for await (const data of WEBREG_TERMS) {
            const json: WebRegSection[] | { error: string; } | null = await GeneralUtilities.tryExecuteAsync(async () => {
                // You will need the ucsd_webreg_rs app available
                const d = await Bot.AxiosClient.get(
                    `http://127.0.0.1:3000/webreg/course_info/${data.term}?subject=CSE&number=8A`
                );
                return d.data;
            });

            webregStatus.append(data.paddedName).append(" ");
            if (!json || "error" in json) {
                webregStatus.append(EmojiConstants.X_EMOJI);
            } else {
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
            value: StringUtil.codifyString(`${MutableConstants.CAPE_DATA.length} Entries Loaded.`)
        });
        statusEmbed.addFields({
            name: "Course Listings",
            value: StringUtil.codifyString(`${MutableConstants.COURSE_LISTING.length} Courses Loaded.`)
        });
        statusEmbed.addFields({
            name: `Cached Sections (${MutableConstants.CACHED_DATA_TERM})`,
            value: StringUtil.codifyString(`${MutableConstants.SECTION_TERM_DATA.length} Sections Loaded.`)
        });
        statusEmbed.addFields({
            name: "Enrollment Graphs: Overall",
            value: StringUtil.codifyString(
                table([
                    ["Term", "General", "Wide", "FSP"],
                    ...MutableConstants.GH_TERMS.map((x) => {
                        const general = MutableConstants.OVERALL_ENROLL.get(x.term)?.length ?? 0;
                        const wide = MutableConstants.OVERALL_ENROLL_WIDE.get(x.term)?.length ?? 0;
                        const fsp = MutableConstants.OVERALL_ENROLL_FSP.get(x.term)?.length ?? 0;

                        return [x.term, general, wide, fsp];
                    }),
                ])
            )
        });
        statusEmbed.addFields({
            name: "Enrollment Graphs: Section",
            value: StringUtil.codifyString(
                table([
                    ["Term", "General", "Wide", "FSP"],
                    ...MutableConstants.GH_TERMS.map((x) => {
                        const general = MutableConstants.SECTION_ENROLL.get(x.term)?.length ?? 0;
                        const wide = MutableConstants.SECTION_ENROLL_WIDE.get(x.term)?.length ?? 0;
                        const fsp = MutableConstants.SECTION_ENROLL_FSP.get(x.term)?.length ?? 0;

                        return [x.term, general, wide, fsp];
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
