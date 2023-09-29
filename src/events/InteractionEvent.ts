import { ChatInputCommandInteraction, Interaction } from "discord.js";
import { Bot } from "../Bot";
import { StringUtil } from "../utilities/StringUtilities";
import { TimeUtilities } from "../utilities/TimeUtilities";
import { StringBuilder } from "../utilities/StringBuilder";
import { ICommandContext } from "../commands";
import { GeneralUtilities } from "../utilities/GeneralUtilities";
import { Data } from "../Data";

/**
 * Executes the slash command, if any.
 * @param {ChatInputCommandInteraction} interaction The interaction.
 */
async function slashCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
    const foundCommand = new Map().get(interaction.commandName);
    if (!foundCommand) {
        return;
    }

    const ctx: ICommandContext = {
        user: interaction.user,
        guild: interaction.guild,
        interaction: interaction,
        channel: interaction.channel!,
        member: (await interaction.guild?.members.fetch(interaction.user.id)) ?? null,
    };

    // Check cooldown.
    const cooldownLeft = foundCommand.checkCooldownFor(ctx.user);
    if (cooldownLeft > 0) {
        const coolDownDur = TimeUtilities.formatDuration(cooldownLeft, true, false);
        await interaction.reply({
            content: `You are on cooldown for **\`${coolDownDur}\`**.`,
            ephemeral: true,
        });

        return;
    }

    // Guild only?
    if (foundCommand.commandInfo.guildOnly && !ctx.guild) {
        await interaction.reply({
            content: "This command can only be used in a guild.",
            ephemeral: true,
        });
        return;
    }

    // Check permissions
    const canRunInfo = foundCommand.hasPermissionToRun(ctx.member!, ctx.guild);
    if (!Data.CONFIG.discord.botOwnerIds.includes(ctx.user.id) && !canRunInfo.hasAdmin) {
        foundCommand.addToCooldown(ctx.user);
    }

    if (canRunInfo.canRun) {
        await foundCommand.run(ctx);
        return;
    }

    if (canRunInfo.reason) {
        await interaction.reply({
            content: canRunInfo.reason,
            ephemeral: true,
        });
        return;
    }

    // Acknowledge any permission issues.
    const noPermSb = new StringBuilder().append(
        "You, or the bot, are missing permissions needed to run the command."
    );
    const noPermissionEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, "Red").setTitle(
        "Missing Permissions."
    );

    if (canRunInfo.missingUserPerms.length !== 0) {
        noPermissionEmbed
            .addFields({
                name: "Missing Member Permissions (Need ≥ 1)",
                value: StringUtil.codifyString(canRunInfo.missingUserPerms.join(", "))
            })
            .addFields({
                name: "Missing Member Permissions (Need ≥ 1)",
                value: StringUtil.codifyString(canRunInfo.missingUserPerms.join(", "))
            });
        noPermSb
            .appendLine()
            .append(
                "- You need to fulfill at least __one__ of the two missing member permissions."
            );
    }

    if (canRunInfo.missingBotPerms.length !== 0) {
        noPermissionEmbed.addFields({
            name: "Missing Bot Permissions (Need All)",
            value: StringUtil.codifyString(canRunInfo.missingBotPerms.join(", "))
        });
        noPermSb
            .appendLine()
            .append("- The bot needs every permission that is specified to run this command.");
    }

    if (noPermissionEmbed.data.fields?.length === 0) {
        noPermissionEmbed.addFields({
            name: "Unknown Error",
            value: "Something wrong occurred. Please try again later."
        });
        noPermSb.appendLine().append("- Unknown error occurred. Please report this.");
    }

    await interaction.reply({
        embeds: [noPermissionEmbed.setDescription(noPermSb.toString())],
    });
}

export async function onInteractionEvent(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
        await slashCommandHandler(interaction);
        return;
    }
}
