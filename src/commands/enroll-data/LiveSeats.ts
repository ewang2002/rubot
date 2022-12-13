import {BaseCommand, ICommandContext} from "../BaseCommand";
import {getColorByPercent, LOOKUP_ARGUMENTS, parseCourseSubjCode, requestFromWebRegApi} from "./helpers/Helper";
import {EmojiConstants, GeneralConstants} from "../../constants/GeneralConstants";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";
import {StringUtil} from "../../utilities/StringUtilities";
import {MessageEmbed} from "discord.js";
import {MutableConstants} from "../../constants/MutableConstants";
import * as table from "text-table";
import {StringBuilder} from "../../utilities/StringBuilder";
import {WebRegSection} from "../../definitions";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {Bot} from "../../Bot";

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
        const term = ctx.interaction.options.getString("term", false) ?? MutableConstants.DEFAULT_TERM;
        const codeArg = ctx.interaction.options.getString("course_subj_num", true);
        const allCodes = codeArg.split(",").map(x => x.trim()).filter(x => x.length > 0);

        if (allCodes.length === 0) {
            await ctx.interaction.reply({
                content: "Invalid input. Your input should be in the form `subj num1, subj num2, ...`",
                ephemeral: true
            });

            return -1;
        }

        const processRows = (json: WebRegSection[]): string[][] => {
            return [
                ["SEC", "Code", "ENR", "AVA", "TTL", "WL", "EN", "V"]
            ].concat(
                json.map(data => {
                    return [
                        data.section_id,
                        data.section_code,
                        data.enrolled_ct.toString(),
                        (data.enrolled_ct >= data.total_seats || data.waitlist_ct > 0 ? 0 : data.available_seats).toString(),
                        data.total_seats.toString(),
                        data.waitlist_ct.toString(),
                        data.available_seats === 0 || data.waitlist_ct > 0
                            ? "X"
                            : "✓",
                        data.is_visible
                            ? "✓"
                            : "X"
                    ]
                })
            );
        };

        const getStats = (json: WebRegSection[]): [number, number, string] => {
            const ttlEnrolled = json.map(x => x.enrolled_ct).reduce((prev, curr) => prev + curr);
            const ttlCapacity = json.map(x => x.total_seats).reduce((prev, curr) => prev + curr);
            const percentFilled = ttlCapacity === 0
                ? "N/A"
                : ((ttlEnrolled / ttlCapacity) * 100).toPrecision(5) + "%";

            return [ttlEnrolled, ttlCapacity, percentFilled];
        }

        if (allCodes.length === 1) {
            const json = await requestFromWebRegApi(ctx, term, allCodes[0]);
            // Already handled for us.
            if (!json) {
                return -1;
            }

            const parsedCode = parseCourseSubjCode(allCodes[0]);

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

            const rows = processRows(json);

            const [, , percentFilled] = getStats(json);

            const tableRows = table(rows).split("\n");
            const fields = ArrayUtilities.arrayToStringFields(tableRows, (_, elem) => elem + "\n", 1000);
            let addedInit = false;
            for (const field of fields) {
                embed.addField(
                    addedInit
                        ? GeneralConstants.ZERO_WIDTH_SPACE
                        : `Percent Enrolled: ${percentFilled}`,
                    StringUtil.codifyString(field)
                );
                addedInit = true;
            }

            await ctx.interaction.editReply({
                embeds: [embed]
            });

            return 0;
        }

        // Max of 4 codes
        while (allCodes.length > 6) {
            allCodes.pop();
        }

        const returnEmbed = new MessageEmbed()
            .setColor("RANDOM")
            .setTitle(`WebReg Info, Multi-Search (Term: ${term})`)
            .setFooter({
                text: "Data Fetched from WebReg."
            })
            .setTimestamp();

        await ctx.interaction.deferReply();
        const desc = new StringBuilder();
        const processedCodes = new Set<string>();
        for await (const code of allCodes) {
            const parsedCode = parseCourseSubjCode(code);
            if (processedCodes.has(parsedCode)) {
                continue;
            }

            if (parsedCode.indexOf(" ") === -1) {
                desc.append(`- \`${code}\`: ${EmojiConstants.QUESTION_MARK_EMOJI} Invalid Code`).appendLine();
                continue;
            }

            processedCodes.add(parsedCode);

            const [subj, num] = parsedCode.split(" ");
            const json: WebRegSection[] | { "error": string } | null = await GeneralUtilities.tryExecuteAsync(async () => {
                const d = await Bot.AxiosClient.get(`http://127.0.0.1:8000/course/${term}/${subj}/${num}`);
                return d.data;
            });

            if (!json || "error" in json) {
                desc.append(`- \`${code}\`: ${EmojiConstants.WARNING_EMOJI} Internal Error`).appendLine();
                continue;
            }

            if (json.length === 0) {
                desc.append(`- \`${parsedCode}\`: ${EmojiConstants.X_EMOJI} No Sections Found`).appendLine();
                continue;
            }

            const rows = processRows(json);
            const [, , percentFilled] = getStats(json);

            const tableRows = table(rows).split("\n");
            const fields = ArrayUtilities.arrayToStringFields(tableRows, (_, elem) => elem + "\n", 1000);

            let numFieldsAdded = 0;
            for (const field of fields) {
                returnEmbed.addField(`Course **${parsedCode}**`, StringUtil.codifyString(field));

                if (returnEmbed.length > 5800 || returnEmbed.fields.length > 25) {
                    returnEmbed.fields.pop();
                    break;
                }

                numFieldsAdded++;
            }

            // If numFieldsAdded != fields.length, then break out since we will exceed the embed limit
            desc.append(`- \`${parsedCode}\`: ${percentFilled} Enrolled `);
            if (numFieldsAdded !== fields.length) {
                desc.append(" (Some Entries Omitted)");
                break;
            }

            desc.appendLine();
        }

        returnEmbed.setDescription(desc.toString());
        await ctx.interaction.editReply({
            embeds: [returnEmbed]
        });

        return 0;
    }
}