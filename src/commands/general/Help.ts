import BaseCommand, { ArgumentType, IArgumentInfo, ICommandConf, ICommandContext, RequiredElevatedPermission, } from "../BaseCommand";

import { ArrayUtilities, GeneralUtilities, StringBuilder, StringUtil } from "../../utilities";
import { CommandRegistry } from "..";

export default class Help extends BaseCommand {
    public constructor() {
        const cmi: ICommandConf = {
            cmdCode: "HELP",
            formalCommandName: "Help",
            botCommandName: "help",
            description: "Runs the help command. This lists all commands.",
            generalPermissions: [],
            botPermissions: [],
            argumentInfo: [
                {
                    displayName: "Command Name",
                    argName: "command",
                    desc: "The command to find help information for.",
                    type: ArgumentType.String,
                    required: false,
                    example: ["help", "ping"],
                },
            ],
            commandCooldown: 4 * 1000,
            guildOnly: false,
            elevatedPermReq: RequiredElevatedPermission.None
        };

        super(cmi);
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const cmdName = ctx.interaction.options.getString("command");
        let showCmdHelp = false;

        if (cmdName) {
            const command = CommandRegistry.getCommandByName(cmdName);
            if (command) {
                let elevatedPerm: string;
                if (command.commandInfo.elevatedPermReq === RequiredElevatedPermission.None) {
                    elevatedPerm = "None";
                }
                else if (command.commandInfo.elevatedPermReq === RequiredElevatedPermission.ModOrOwner) {
                    elevatedPerm = "Bot Moderator or Bot Owner";
                }
                else if (command.commandInfo.elevatedPermReq === RequiredElevatedPermission.OwnerOnly) {
                    elevatedPerm = "Bot Owner Only";
                }
                else {
                    elevatedPerm = "Unknown";
                }

                const cmdHelpEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, "Green")
                    .setTitle(`Command Help: **${command.commandInfo.formalCommandName}**`)
                    .setFooter({
                        text: `Server Context: ${ctx.guild?.name ?? "Direct Message"}`,
                    })
                    .setDescription(command.commandInfo.description)
                    .addFields({
                        name: "Command Code",
                        value: StringUtil.codifyString(command.commandInfo.botCommandName)
                    })
                    .addFields({
                        name: "Guild Only?",
                        value: StringUtil.codifyString(command.commandInfo.guildOnly ? "Yes" : "No"),
                        inline: true
                    })
                    .addFields({
                        name: "Elevated Permission Required?",
                        value: StringUtil.codifyString(elevatedPerm),
                        inline: true
                    })
                    .addFields({
                        name: "Discord User Permissions Needed (≥ 1)",
                        value: StringUtil.codifyString(
                            command.commandInfo.generalPermissions.length > 0
                                ? command.commandInfo.generalPermissions.join(", ")
                                : "N/A."
                        )
                    })
                    .addFields({
                        name: "Discord Bot Permissions Needed (≥ 1)",
                        value: StringUtil.codifyString(
                            command.commandInfo.botPermissions.length > 0
                                ? command.commandInfo.botPermissions
                                : "N/A."
                        )
                    });

                const argDisplay = ArrayUtilities.arrayToStringFields<IArgumentInfo>(
                    command.commandInfo.argumentInfo,
                    (_, elem) => {
                        return new StringBuilder()
                            .append(`__Argument__: ${elem.displayName} (\`${elem.argName}\`)`)
                            .appendLine()
                            .append(`- ${elem.desc}`)
                            .appendLine()
                            .append(`- Required? ${elem.required ? "Yes" : "No"}`)
                            .appendLine()
                            .append(`- Example(s): \`[${elem.example.join(", ")}]\``)
                            .appendLine(2)
                            .toString();
                    }
                );

                for (const d of argDisplay) {
                    cmdHelpEmbed.addFields({
                        name: `Argument Information (${command.commandInfo.argumentInfo.length})`,
                        value: d
                    });
                }

                await ctx.interaction.reply({
                    embeds: [cmdHelpEmbed],
                });

                return 0;
            }

            showCmdHelp = true;
        }

        const helpEmbed = GeneralUtilities.generateBlankEmbed(ctx.user, "Green")
            .setTitle("Command List")
            .setFooter({
                text: `Server Context: ${ctx.guild?.name ?? "Direct Messages"}`,
            })
            .setDescription(
                showCmdHelp
                    ? `The command, \`${cmdName}\`, could not be found. Try looking through the list below.`
                    : "Below is a list of all supported commands."
            );

        for (const [category, commands] of CommandRegistry.getAllCommands()) {
            helpEmbed.addFields({
                name: category,
                value: StringUtil.codifyString(
                    commands
                        .filter((x) => x.hasPermissionToRun(ctx.user, ctx.guild))
                        .map((x) => x.commandInfo.botCommandName)
                        .join(", ")
                )
            });
        }

        await ctx.interaction.reply({
            embeds: [helpEmbed],
        });
        return 0;
    }
}
