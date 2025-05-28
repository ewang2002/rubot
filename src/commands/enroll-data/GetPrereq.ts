import { EmbedBuilder } from "discord.js";
import BaseCommand, { ICommandContext } from "../BaseCommand";
import { LOOKUP_ARGUMENTS, parseCourseSubjCode } from "./helpers/Helper";
import { PrerequisiteInfo } from "../../definitions";
import { ArrayUtilities, ScraperApiWrapper, ScraperResponse, StringUtil } from "../../utilities";
import { GeneralConstants } from "../../Constants";
import { DataRegistry } from "../../DataRegistry";

export default class GetPrereq extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "GET_PREREQ",
            formalCommandName: "Get Course Prerequisites",
            botCommandName: "prereq",
            description: "Gets the prerequisites for a course straight from WebReg.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: LOOKUP_ARGUMENTS,
            guildOnly: false,
            botOwnerOnly: false,
            botModeratorIds: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const term =
            ctx.interaction.options.getString("term", false) ?? DataRegistry.DEFAULT_TERM;
        const code = ctx.interaction.options.getString("course_subj_num", true);

        const parsedCode = parseCourseSubjCode(code);
        if (parsedCode.indexOf(" ") === -1) {
            await ctx.interaction.reply({
                content: `Your input, \`${code}\`, is improperly formatted. It should look like \`SUBJ XXX\`.`,
                ephemeral: true,
            });

            return -1;
        }

        const [subj, num] = parsedCode.split(" ");
        await ctx.interaction.deferReply();
        const json: ScraperResponse<PrerequisiteInfo> = await ScraperApiWrapper.getInstance()
            .getPrerequisites(term, subj, num);

        if (!json || "error" in json) {
            await ctx.interaction.editReply({
                content:
                    "An error occurred when trying to request data from WebReg. It's possible that the wrapper" +
                    " being used to interact with WebReg's API is down, or WebReg is in maintenance mode. Try again" +
                    " later.",
            });

            return -1;
        }

        const prereqEmbed = new EmbedBuilder()
            .setTitle(`**${parsedCode}**: Prerequisites (${term})`)
            .setColor("Random")
            .setFooter({ text: "Fetched from WebReg" })
            .setTimestamp();
        if (json.course_prerequisites.length === 0 && json.exam_prerequisites.length === 0) {
            prereqEmbed.setDescription(
                "There are either no prerequisites for this course, or the course doesn't exist."
            );

            await ctx.interaction.editReply({
                embeds: [prereqEmbed],
            });

            return 0;
        }

        if (json.course_prerequisites.length !== 0) {
            const requiredPrereqs = json.course_prerequisites.filter((x) => x.length === 1);
            const otherPrereqs = json.course_prerequisites.filter((x) => x.length > 1);

            if (requiredPrereqs.length !== 0) {
                const fields = ArrayUtilities.arrayToStringFields(
                    requiredPrereqs,
                    (_, elem) => `- ${elem[0].subj_course_id} (${elem[0].course_title})\n`
                );
                let added = false;
                for (const field of fields) {
                    prereqEmbed.addFields({
                        name: added ? GeneralConstants.ZERO_WIDTH_SPACE : "__**All**__ of the Following",
                        value: StringUtil.codifyString(field)
                    });

                    added = true;
                }
            }

            for (const group of otherPrereqs) {
                const fields = ArrayUtilities.arrayToStringFields(
                    group,
                    (_, elem) => `- ${elem.subj_course_id} (${elem.course_title})\n`
                );
                let added = false;
                for (const field of fields) {
                    prereqEmbed.addFields({
                        name: added ? GeneralConstants.ZERO_WIDTH_SPACE : "**One** of the Following",
                        value: StringUtil.codifyString(field)
                    });

                    added = true;
                }
            }
        }

        if (json.exam_prerequisites.length === 0) {
            prereqEmbed.setDescription("The following course prerequisites must be satisfied.");
        }
        else {
            const exams = json.exam_prerequisites.map((x) => `- ${x}`).join("\n");
            let str = `A satisfactory score on one of the following exam(s):\n${StringUtil.codifyString(
                exams
            )}`;
            if (json.course_prerequisites.length !== 0) {
                str += "**or**, the following course prerequisites below.";
            }

            prereqEmbed.setDescription(str);
        }

        await ctx.interaction.editReply({
            embeds: [prereqEmbed],
        });

        return 0;
    }
}
