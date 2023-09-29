import { BaseCommand, ICommandContext } from "../BaseCommand";
import { GeneralUtilities } from "../../utilities/GeneralUtilities";
import { WaitzCompareData, WaitzLiveData } from "../../definitions/WaitzInterfaces";
import {
    ButtonBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    SelectMenuComponentOptionData,
} from "discord.js";
import { StringUtil } from "../../utilities/StringUtilities";
import { StringBuilder } from "../../utilities/StringBuilder";
import { EmojiConstants } from "../../Constants";
import { ArrayUtilities } from "../../utilities/ArrayUtilities";
import { AdvancedCollector } from "../../utilities/AdvancedCollector";
import { Data } from "../../Data";

export class Waitz extends BaseCommand {
    private static NUM_SQUARES: number = 12;

    public constructor() {
        super({
            cmdCode: "WAITZ",
            formalCommandName: "Real-Time Crowd Levels",
            botCommandName: "waitz",
            description:
                "Check real-time crowd levels on campus, powered by Waitz (https://waitz.io/ucsd).",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [],
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * Gets the color for the embed based on percent. Low percent = green, high percent = red.
     * @param {number} percent The percent.
     * @returns {[number, number, number]} The RGB values.
     * @private
     */
    private static getColor(percent: number): number {
        if (percent < 0.15) {
            return 0x0bd604;
        }
        else if (percent < 0.3) {
            return 0x40b53c;
        }
        else if (percent < 0.5) {
            return 0xc6cc1b;
        }
        else if (percent < 0.7) {
            return 0xcc7921;
        }
        else {
            return 0xd61111;
        }
    }

    /**
     * Checks if a location is currently open.
     * @param {object} data The (partial) location information.
     * @returns {boolean} `true` if the location is open and `false` otherwise.
     * @private
     */
    private static isOpen(data: { people: number; capacity: number; isOpen: boolean }): boolean {
        // If it's reported as open, then trust it
        if (data.isOpen) {
            return true;
        }

        // Otherwise, if the location has >15% people (thanks Nish),
        // then pretend it's "open"
        if (data.people / data.capacity > 0.15) {
            return true;
        }

        // Otherwise, it's probably closed
        return false;
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        await ctx.interaction.deferReply();
        const liveResp = await GeneralUtilities.tryExecuteAsync(async () => {
            return await Data.AXIOS.get<WaitzLiveData>("https://waitz.io/live/ucsd");
        });

        const compResp = await GeneralUtilities.tryExecuteAsync(async () => {
            return await Data.AXIOS.get<WaitzCompareData>("https://waitz.io/compare/ucsd");
        });

        if (!liveResp || !compResp) {
            await ctx.interaction.editReply({
                content:
                    "Unable to fetch data from Waitz (https://waitz.io/ucsd). Try again later.",
            });

            return -1;
        }

        const compInfo = compResp.data.data;
        const locations = liveResp.data.data.sort((a, b) => b.busyness - a.busyness);

        const selectOptions: SelectMenuComponentOptionData[] = [];
        const allEmbeds: EmbedBuilder[] = [];
        const labelToIdx: { [label: string]: number } = {};

        for (const entry of locations) {
            const compareData = compInfo.find((x) => x.name === entry.name);
            const embed = new EmbedBuilder()
                .setTitle(
                    `Real-Time Crowd Level @ **${entry.name}** (${
                        Waitz.isOpen(entry) ? "Open" : "Closed"
                    })`
                )
                .setFooter({ text: "Powered by Waitz (https://waitz.io/ucsd)." })
                .setColor(Waitz.getColor(entry.people / entry.capacity))
                .setTimestamp();

            const desc = new StringBuilder()
                .append(
                    StringUtil.getEmojiProgressBar(Waitz.NUM_SQUARES, entry.people / entry.capacity)
                )
                .append(" ")
                .append(`**\`${entry.people} / ${entry.capacity}\`**`)
                .appendLine();

            let hasCompData = false;
            if (compareData) {
                const peak = compareData.comparison?.find((x) => x.trend === "peak");
                const best = compareData.comparison?.find((x) => x.trend === "best");

                if (peak && peak.valid && Array.isArray(peak.value)) {
                    desc.append(
                        `- Best Times: \`${peak.value.length > 0 ? peak.value.join(", ") : "N/A"}\``
                    ).appendLine();
                    hasCompData = true;
                }

                if (best && best.valid && typeof best.value === "string") {
                    desc.append(`- Best Location: \`${best.value ? best.value : "N/A"}\``);
                    hasCompData = true;
                }
            }

            if (!hasCompData) {
                desc.append("No Additional Data Available.");
            }

            embed.setDescription(desc.toString());

            if (entry.subLocs) {
                for (const subLoc of entry.subLocs) {
                    embed.addFields({
                        name: `${subLoc.name} (${Waitz.isOpen(subLoc) ? "Open" : "Closed"})`,
                        value: new StringBuilder()
                            .append(
                                StringUtil.getEmojiProgressBar(
                                    Waitz.NUM_SQUARES,
                                    subLoc.people / subLoc.capacity
                                )
                            )
                            .append(" ")
                            .append(`**\`${subLoc.people} / ${subLoc.capacity}\`**`)
                            .toString()
                    });
                }
            }

            selectOptions.push({
                value: entry.name,
                label: entry.name,
                description: `${entry.people} / ${entry.capacity} (${
                    entry.isOpen ? "Open" : "Closed"
                })`,
                emoji: entry.isOpen
                    ? EmojiConstants.GREEN_SQUARE_EMOJI
                    : EmojiConstants.RED_SQUARE_EMOJI,
            });

            labelToIdx[entry.name] = allEmbeds.length;
            allEmbeds.push(embed);
        }

        if (allEmbeds.length === 0) {
            await ctx.interaction.editReply({
                content: "An unknown error occurred [a].",
            });

            return -1;
        }

        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;
        await ctx.interaction.editReply({
            embeds: [allEmbeds[0]],
            components: AdvancedCollector.getActionRowsFromComponents([
                ...ArrayUtilities.breakArrayIntoSubsets(selectOptions, 25).map((options, i) => {
                    return new StringSelectMenuBuilder()
                        .setOptions(options)
                        .setCustomId(`${uniqueId}_${i}`)
                        .setMaxValues(1)
                        .setMinValues(1);
                }),
                new ButtonBuilder()
                    .setLabel("End Process")
                    .setEmoji(EmojiConstants.STOP_SIGN_EMOJI)
                    .setCustomId(`${uniqueId}_stop`)
                    .setStyle(ButtonStyle.Danger),
            ]),
        });

        await new Promise<void>(async (resolve) => {
            while (true) {
                const interact = await AdvancedCollector.startInteractionEphemeralCollector(
                    {
                        acknowledgeImmediately: true,
                        duration: 60 * 1000,
                        targetAuthor: ctx.user,
                        targetChannel: ctx.channel,
                    },
                    uniqueId
                );

                if (!interact || !interact.isStringSelectMenu()) {
                    resolve();
                    return;
                }

                await ctx.interaction.editReply({
                    embeds: [allEmbeds[labelToIdx[interact.values[0]]]],
                });
            }
        });

        await ctx.interaction.editReply({
            components: [],
        });

        return 0;
    }
}
