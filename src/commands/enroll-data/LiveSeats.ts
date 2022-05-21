import {BaseCommand, ICommandContext} from "../BaseCommand";
import {getColorByPercent, LOOKUP_ARGUMENTS, parseCourseSubjCode, requestFromWebRegApi} from "./helpers/Helper";
import {EmojiConstants, GeneralConstants} from "../../constants/GeneralConstants";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";
import {StringUtil} from "../../utilities/StringUtilities";
import {MessageEmbed} from "discord.js";
import {MutableConstants} from "../../constants/MutableConstants";
import * as table from "text-table";
import {StringBuilder} from "../../utilities/StringBuilder";

export class LiveSeats extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "LIVE_SEATS",
            formalCommandName: "Get Number Enrolled on WebReg",
            botCommandName: "liveseats",
            description: "Looks up a course on WebReg live, getting only the number of seats available + number of" +
                " students enrolled.",
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
        const code = ctx.interaction.options.getString("course_subj_num", true);
        const term = ctx.interaction.options.getString("term", false) ?? MutableConstants.WEBREG_TERMS[0].term;

        const json = await requestFromWebRegApi(ctx, term, code);
        // Already handled for us.
        if (!json) {
            return -1;
        }

        const parsedCode = parseCourseSubjCode(code);

        const numEnrolled = json.map(x => x.enrolled_ct).reduce((p, c) => p + c, 0);
        const total = json.map(x => x.total_seats).reduce((p, c) => p + c, 0);

        const embed = new MessageEmbed()
            .setColor(getColorByPercent(numEnrolled / total))
            .setTitle(`WebReg Info: **${parsedCode}** (Term: ${term})`)
            .setDescription(
                new StringBuilder()
                    .append(`Found ${json.length} section(s) of **\`${parsedCode}\`**.`)
                    .appendLine()
                    .append("- `SEC  :` Section ID").appendLine()
                    .append("- `Code :` Section Code").appendLine()
                    .append("- `ENR  :` Enrolled Count").appendLine()
                    .append("- `TTL  :` Total Seats").appendLine()
                    .append("- `WL   :` Waitlist Count").appendLine()
                    .append("- `S    :` Enrollable?").appendLine()
                    .toString()
            )
            .setFooter({
                text: "Data Fetched from WebReg."
            })
            .setTimestamp();

        const rows = [
            ["SEC", "Code", "ENR", "TTL", "WL", "S"]
        ].concat(
            json.map(data => {
                return [
                    data.section_id,
                    data.section_code,
                    data.enrolled_ct.toString(),
                    data.total_seats.toString(),
                    data.waitlist_ct.toString(),
                    data.available_seats === 0 || data.waitlist_ct > 0
                        ? EmojiConstants.X_EMOJI
                        : EmojiConstants.GREEN_CHECK_EMOJI
                ]
            })
        );

        const tableRows = table(rows).split("\n");
        const fields = ArrayUtilities.arrayToStringFields(tableRows, (_, elem) => elem + "\n", 1000);
        let addedInit = false;
        for (const field of fields) {
            embed.addField(
                addedInit ? GeneralConstants.ZERO_WIDTH_SPACE : "All Sections",
                StringUtil.codifyString(field)
            );
            addedInit = true;
        }

        await ctx.interaction.editReply({
            embeds: [embed]
        });

        return 0;
    }
}