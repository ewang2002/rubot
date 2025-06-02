import { exec as execute } from "child_process";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { promisify } from "util";
import { EmojiConstants, GeneralConstants } from "../../Constants";
import { StringUtil } from "../../utilities";
import BaseCommand, { ArgumentType, ICommandContext, RequiredElevatedPermission } from "../BaseCommand";

export default class Exec extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "EXEC",
            formalCommandName: "Execute Command",
            botCommandName: "exec",
            description: "Executes a command.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [
                {
                    displayName: "Command",
                    argName: "cmd",
                    type: ArgumentType.String,
                    desc: "The command to execute.",
                    required: true,
                    example: ["ls -l"],
                },
            ],
            guildOnly: false,
            elevatedPermReq: RequiredElevatedPermission.OwnerOnly
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const rawCmd = ctx.interaction.options.getString("cmd", true);
        let cmdToRun = rawCmd;
        // Simple hack for now
        if (process.platform === "linux") {
            cmdToRun = "cd ~ && " + cmdToRun;
        }

        const exec = promisify(execute);
        await ctx.interaction.deferReply();

        const embed = new EmbedBuilder()
            .setTitle(`${EmojiConstants.GEAR_EMOJI} Execution Result`)
            .setDescription("Command Executed:\n" + StringUtil.codifyString(rawCmd))
            .setTimestamp();
        const files: AttachmentBuilder[] = [];

        const addToEmbedAndArrays = (output: string, title: string, fileName: string) => {
            if (output.length === 0) {
                output = "<No Output Produced>";
            }

            if (output.length < GeneralConstants.FIELD_MAX_LEN - 8) {
                embed.addFields({
                    name: title,
                    value: StringUtil.codifyString(output),
                });
            }
            else {
                embed.addFields({
                    name: title,
                    value: `See the corresponding \`${fileName}\` file for the full output.\n` 
                        + StringUtil.codifyString(output.substring(0, GeneralConstants.FIELD_MAX_LEN - 128) + "..."),
                });

                files.push(new AttachmentBuilder(Buffer.from(output, "utf8"), { name: fileName }));
            }
        };

        try {
            const { stdout, stderr } = await exec(cmdToRun, { timeout: 60 * 1000 });
            addToEmbedAndArrays(stdout, "Standard Output", "stdout.txt");
            addToEmbedAndArrays(stderr, "Standard Error", "stderr.txt");
            embed.setColor("Green");
        }
        catch (e) {
            if (typeof e === "object" && e && "stdout" in e && "stderr" in e) {
                const { stdout, stderr } = e as { stdout: string; stderr: string };
                addToEmbedAndArrays(stdout, "Standard Output", "stdout.txt");
                addToEmbedAndArrays(stderr, "Standard Error", "stderr.txt");
                addToEmbedAndArrays(e + "", "Error", "error.txt");
                embed.setColor("Red");
            }
            else {
                addToEmbedAndArrays(e + "", "Error", "error.txt");
            }
        }

        await ctx.interaction.editReply({
            files,
            embeds: [embed],
        });

        return 0;
    }
}
