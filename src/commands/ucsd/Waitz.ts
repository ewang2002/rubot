import {BaseCommand, ICommandContext} from "../BaseCommand";
import {GeneralUtilities} from "../../utilities/GeneralUtilities";
import {Bot} from "../../Bot";
import {WaitzCompareData, WaitzLiveData} from "../../definitions/WaitzInterfaces";
import {MessageButton, MessageComponent, MessageEmbed, MessageSelectMenu, MessageSelectOptionData} from "discord.js";
import {StringUtil} from "../../utilities/StringUtilities";
import {StringBuilder} from "../../utilities/StringBuilder";
import {EmojiConstants} from "../../constants/GeneralConstants";
import {ArrayUtilities} from "../../utilities/ArrayUtilities";
import {AdvancedCollector} from "../../utilities/AdvancedCollector";

export class Waitz extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "WAITZ",
            formalCommandName: "Real-Time Crowd Levels",
            botCommandName: "waitz",
            description: "Check real-time crowd levels on campus, powered by Waitz (https://waitz.io/ucsd).",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [],
            guildOnly: false,
            botOwnerOnly: false
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
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        await ctx.interaction.deferReply();
        const liveResp = await GeneralUtilities.tryExecuteAsync(async () => {
            return await Bot.AxiosClient.get<WaitzLiveData>("https://waitz.io/live/ucsd");
        });

        const compResp = await GeneralUtilities.tryExecuteAsync(async () => {
            return await Bot.AxiosClient.get<WaitzCompareData>("https://waitz.io/compare/ucsd");
        });

        if (!liveResp || !compResp) {
            await ctx.interaction.editReply({
                content: "Unable to fetch data from Waitz (https://waitz.io/ucsd). Try again later."
            });

            return -1;
        }

        const compInfo = compResp.data.data;
        const locations = liveResp.data.data.sort((a, b) => b.busyness - a.busyness);

        const selectOptions: MessageSelectOptionData[] = [];
        const allEmbeds: MessageEmbed[] = [];
        const labelToIdx: { [label: string]: number } = {};

        for (const entry of locations) {
            const compareData = compInfo.find(x => x.name === entry.name);
            const embed = new MessageEmbed()
                .setTitle(`Real-Time Crowd Level @ **${entry.name}** (${entry.isOpen ? "Open" : "Closed"})`)
                .setFooter({text: "Powered by Waitz (https://waitz.io/ucsd)."})
                .setColor(Waitz.getColor(entry.people / entry.capacity))
                .setTimestamp();

            const desc = new StringBuilder()
                .append(StringUtil.getEmojiProgressBar(15, entry.people / entry.capacity))
                .append(" ")
                .append(`**\`${entry.people} / ${entry.capacity}\`**`)
                .appendLine();

            let hasCompData = false;
            if (compareData) {
                const peak = compareData.comparison?.find(x => x.trend === "peak");
                const best = compareData.comparison?.find(x => x.trend === "best");

                if (peak && peak.valid && Array.isArray(peak.value)) {
                    desc.append(`- Best Times: \`${peak.value.join(", ")}\``)
                        .appendLine();
                    hasCompData = true;
                }

                if (best && best.valid && typeof best.value === "string") {
                    desc.append(`- Best Location: \`${best.value}\``);
                    hasCompData = true;
                }
            }

            if (!hasCompData) {
                desc.append("No Additional Data Available.");
            }

            embed.setDescription(desc.toString());

            if (entry.subLocs) {
                for (const subLoc of entry.subLocs) {
                    embed.addField(
                        `${subLoc.name} (${subLoc.isOpen ? "Open" : "Closed"})`,
                        new StringBuilder()
                            .append(StringUtil.getEmojiProgressBar(
                                15,
                                subLoc.people / subLoc.capacity)
                            )
                            .append(" ")
                            .append(`**\`${subLoc.people} / ${subLoc.capacity}\`**`)
                            .toString()
                    )
                }
            }

            selectOptions.push({
                value: entry.name,
                label: entry.name,
                description: `${entry.people} / ${entry.capacity} (${entry.isOpen ? "Open" : "Closed"})`,
                emoji: entry.isOpen ? EmojiConstants.GREEN_SQUARE_EMOJI : EmojiConstants.RED_SQUARE_EMOJI
            });

            labelToIdx[entry.name] = allEmbeds.length;
            allEmbeds.push(embed);
        }

        if (allEmbeds.length === 0) {
            await ctx.interaction.editReply({
                content: "An unknown error occurred [a]."
            });

            return -1;
        }

        const uniqueId = `${Date.now()}_${ctx.user.id}_${Math.random()}`;
        const components: MessageComponent[] = [
            ...ArrayUtilities.breakArrayIntoSubsets(selectOptions, 25).map((options, i) => {
                return new MessageSelectMenu()
                    .setOptions(options)
                    .setCustomId(`${uniqueId}_${i}`)
                    .setMaxValues(1)
                    .setMinValues(1)
            }),
            new MessageButton()
                .setLabel("End Process")
                .setEmoji(EmojiConstants.STOP_SIGN_EMOJI)
                .setCustomId(`${uniqueId}_stop`)
                .setStyle("DANGER")
        ];

        await ctx.interaction.editReply({
            embeds: [allEmbeds[0]],
            components: AdvancedCollector.getActionRowsFromComponents(components)
        });

        await new Promise<void>(async resolve => {
            while (true) {
                const interact = await AdvancedCollector.startInteractionEphemeralCollector({
                    acknowledgeImmediately: true,
                    duration: 60 * 1000,
                    targetAuthor: ctx.user,
                    targetChannel: ctx.channel
                }, uniqueId);

                if (!interact || !interact.isSelectMenu()) {
                    resolve();
                    return;
                }


                await ctx.interaction.editReply({
                    embeds: [allEmbeds[labelToIdx[interact.values[0]]]]
                });
            }
        });

        await ctx.interaction.editReply({
            components: []
        });

        return 0;
    }
}