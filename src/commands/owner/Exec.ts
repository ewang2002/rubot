import { exec as execute } from "child_process";
import { MessageAttachment } from "discord.js";
import { promisify } from "util";
import { EmojiConstants } from "../../constants/GeneralConstants";
import { StringUtil } from "../../utilities/StringUtilities";
import {ArgumentType, BaseCommand, ICommandContext} from "../BaseCommand";

export class Exec extends BaseCommand {
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
                    prettyType: "String",
                    desc: "The command to execute.",
                    required: true,
                    example: ["ls -l"]
                }
            ],
            guildOnly: false,
            botOwnerOnly: true
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        let rawCmd = ctx.interaction.options.getString("cmd", true);
        let cmdToRun = rawCmd;
        // Simple hack for now
        if (process.platform === "linux") {
            cmdToRun = "cd ~ && " + cmdToRun;
        }

        const exec = promisify(execute);
        await ctx.interaction.deferReply();
        try {
            const {stdout, stderr} = await exec(cmdToRun, {timeout: 60 * 1000});

            await ctx.interaction.editReply({
                files: [
                    new MessageAttachment(Buffer.from(stdout, "utf8"), "stdout.txt"),
                    new MessageAttachment(Buffer.from(stderr, "utf8"), "stderr.txt")
                ],
                content: `Command Executed: ${StringUtil.codifyString(rawCmd)}`
            });
        } catch (e) {
            if (typeof e === "object" && e && "stdout" in e && "stderr" in e) {
                const {stdout, stderr} = e as {stdout: string; stderr: string;};
                await ctx.interaction.editReply({
                    files: [
                        new MessageAttachment(Buffer.from(stdout, "utf8"), "stdout.txt"),
                        new MessageAttachment(Buffer.from(stderr, "utf8"), "stderr.txt"),
                        new MessageAttachment(Buffer.from(e + "", "utf8"), "error.txt")
                    ],
                    content: `${EmojiConstants.WARNING_EMOJI} Command Executed: ${StringUtil.codifyString(rawCmd)}`
                });
            } 
            else {
                await ctx.interaction.editReply({
                    files: [
                        new MessageAttachment(Buffer.from(e + "", "utf8"), "error.txt")
                    ],
                    content: `Command Executed: ${StringUtil.codifyString(rawCmd)}`
                });
            }
        }

        return 0;
    }
}