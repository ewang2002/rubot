import BaseCommand, { ICommandContext } from "../BaseCommand";
import { EmbedBuilder } from "discord.js";
import { StringUtil, TimeUtilities } from "../../utilities";
import { Bot } from "../../Bot";
import { DataRegistry } from "../../DataRegistry";
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
            botModeratorIds: false
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

        statusEmbed.addFields({
            name: "CAPE",
            value: StringUtil.codifyString(`${DataRegistry.CAPE_DATA.length} Entries Loaded.`)
        });
        statusEmbed.addFields({
            name: "Course Listings",
            value: StringUtil.codifyString(`${DataRegistry.COURSE_LISTING.length} Courses Loaded.`)
        });
        statusEmbed.addFields({
            name: `Cached Sections (${DataRegistry.CONFIG.ucsdInfo.miscData.currentTermData.term})`,
            value: StringUtil.codifyString(`${DataRegistry.SECTION_TERM_DATA.length} Sections Loaded.`)
        });
        statusEmbed.addFields({
            name: "Enrollment Graphs: Overall",
            value: StringUtil.codifyString(
                table([
                    ["Term", "General", "Wide"],
                    ...DataRegistry.CONFIG.ucsdInfo.githubTerms.map((x) => {
                        const general = DataRegistry.OVERALL_ENROLL.get(x.term)?.length ?? 0;
                        const wide = DataRegistry.OVERALL_ENROLL_WIDE.get(x.term)?.length ?? 0;

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
