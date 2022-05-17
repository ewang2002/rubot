import {BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {Bot} from "../../Bot";
import {displayInteractiveWebregData, getColorByPercent, LOOKUP_ARGUMENTS, parseCourseSubjCode} from "./helpers/Helper";
import {WebRegSection} from "../../definitions";
import {StringBuilder} from "../../utilities/StringBuilder";
import {EmojiConstants, GeneralConstants} from "../../constants/GeneralConstants";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";
import {StringUtil} from "../../utilities/StringUtilities";
import {MessageEmbed} from "discord.js";
import {MutableConstants} from "../../constants/MutableConstants";

export class LookupLive extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "LOOKUP_COURSE",
            formalCommandName: "Lookup Course on WebReg",
            botCommandName: "lookuplive",
            description: "Looks up a course on WebReg live. This will only get the course information for the term" +
                " with the active enrollment period.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: LOOKUP_ARGUMENTS,
            guildOnly: false,
            botOwnerOnly: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const term = ctx.interaction.options.getString("term", false) ?? MutableConstants.WEBREG_TERMS[0].term;
        const code = ctx.interaction.options.getString("course_subj_num", true);
        const showAll = ctx.interaction.options.getBoolean("show_all", false) ?? true;
        const parsedCode = parseCourseSubjCode(code);
        if (parsedCode.indexOf(" ") === -1) {
            await ctx.interaction.reply({
                content: `Your input, \`${code}\`, is improperly formatted. It should look like \`SUBJ XXX\`.`,
                ephemeral: true
            });

            return -1;
        }

        const [subj, num] = parsedCode.split(" ");
        await ctx.interaction.deferReply();
        const json: WebRegSection[] | { "error": string } | null = await GeneralUtilities.tryExecuteAsync(async () => {
            // You will need the ucsd_webreg_rs app available
            const d = await Bot.AxiosClient.get(`http://localhost:8000/course/${term}/${subj}/${num}`);
            return d.data;
        });

        if (!json || "error" in json) {
            await ctx.interaction.editReply({
                content: "An error occurred when trying to request data from WebReg. It's possible that the wrapper" +
                    " being used to interact with WebReg's API is down, or WebReg is in maintenance mode. Try again" +
                    " later."
            });

            return -1;
        }

        if (json.length === 0) {
            await ctx.interaction.editReply({
                content: `No data was found for **\`${parsedCode}\`** (Term: \`${term}\`).`
            });

            return 0;
        }

        if (!showAll) {
            const numEnrolled = json.map(x => x.enrolled_ct).reduce((p, c) => p + c, 0);
            const total = json.map(x => x.total_seats).reduce((p, c) => p + c, 0);

            const embed = new MessageEmbed()
                .setColor(getColorByPercent(numEnrolled / total))
                .setTitle(`WebReg Info: **${parsedCode}** (Term: ${term})`)
                .setDescription(`Found ${json.length} section(s) of **\`${parsedCode}\`**.`)
                .setFooter({
                    text: "Data Fetched from WebReg."
                })
                .setTimestamp();

            const parsedJson = json.map(x => {
                return new StringBuilder()
                    .append(`[${x.section_id}] ${x.section_code}: `)
                    .append(
                        x.available_seats === 0 || x.waitlist_ct > 0
                            ? EmojiConstants.RED_SQUARE_EMOJI
                            : EmojiConstants.GREEN_SQUARE_EMOJI
                    )
                    .append(` ${x.enrolled_ct}/${x.total_seats}`)
                    .append(` (${x.waitlist_ct} WL)`)
                    .appendLine()
                    .toString();
            });

            const fields = ArrayUtilities.arrayToStringFields(parsedJson, (_, elem) => elem, 1000);
            for (const field of fields) {
                embed.addField(GeneralConstants.ZERO_WIDTH_SPACE, StringUtil.codifyString(field));
            }

            await ctx.interaction.editReply({
                embeds: [embed]
            });

            return 0;
        }

        await displayInteractiveWebregData(ctx, json, term, parsedCode, true);
        return 0;
    }
}