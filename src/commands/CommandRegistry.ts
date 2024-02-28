import { Client, Collection, REST, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import BaseCommand from "./BaseCommand";

import * as fsp from "fs/promises";
import * as path from "path";
import { ICategoryConf } from "../definitions";
import { GeneralConstants } from "../Constants";

export namespace CommandRegistry {
    const MAPPED_COMMANDS: Collection<string, BaseCommand[]> = new Collection();
    const NAME_TO_COMMAND: Collection<string, BaseCommand> = new Collection();
    let isLoaded: boolean = false;

    /**
     * Searches for, and loads all, commands that have been defined.
     *
     * @returns {Promise<number>} The number of commmands loaded.
     */
    export async function loadCommands(): Promise<number> {
        if (isLoaded) {
            return 0;
        }

        isLoaded = true;
        const outPath = path.join(__dirname, "..", "..", "out", "commands");
        const foldersToProcess = await fsp.readdir(outPath, { withFileTypes: true })
            .then(allItems => allItems
                .filter(item => item.isDirectory())
                .map(dir => path.join(outPath, dir.name)));

        for (const folder of foldersToProcess) {
            const contentOfCategory: ICategoryConf = await import(path.join(folder, GeneralConstants.CONFIG_JS_FILE))
                .then(obj => obj.default);
            const commands: BaseCommand[] = [];

            // Get all command files
            const allFiles = await fsp.readdir(folder, { withFileTypes: true })
                .then(allItems => allItems
                    .filter(item => item.isFile() && item.name !== GeneralConstants.CONFIG_JS_FILE)
                    .map(file => path.join(folder, file.name)));
            for (const file of allFiles) {
                const cmd: BaseCommand = new (await import(file).then(obj => obj.default));

                if (cmd.data.name !== cmd.commandInfo.botCommandName) {
                    throw new Error(
                        `Names not matched: '${cmd.data.name}' - '${cmd.commandInfo.botCommandName}'`
                    );
                }

                if (NAME_TO_COMMAND.has(cmd.commandInfo.botCommandName)) {
                    throw new Error(`Command '${cmd.commandInfo.botCommandName}' initialized several times.`);
                }
                NAME_TO_COMMAND.set(cmd.commandInfo.botCommandName, cmd);
                commands.push(cmd);
            }

            MAPPED_COMMANDS.set(contentOfCategory.categoryName, commands);
        }

        return NAME_TO_COMMAND.size;
    }

    /**
     * Calls Discord's API to register these commands through Discord's API.
     *
     * @param {REST} rest An instance of the endpoint manager for Discord's API.
     * @param {Client} client The client. It is assumed that the client is already logged in.
     * @param {string[]} [guildIds] The guild IDs. If this is provided, then commands will be loaded ONLY
     *                              for those guilds. If it's not provided, or it's empty, then commands
     *                              will be loaded globally.
     */
    export async function registerCommands(rest: REST, client: Client, guildIds?: string[]) {
        const jsonCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
        for (const command of NAME_TO_COMMAND.values()) {
            jsonCommands.push(command.data.toJSON());
        }

        if (guildIds && guildIds.length > 0) {
            await Promise.all(
                client.guilds.cache.map(async (guild) => {
                    await guild.commands.set(jsonCommands);
                })
            );
        }
        else {
            client.application?.commands.set(jsonCommands);
        }
    }

    /**
     * Clears all commands that have been registered. This does NOT unregister the commands on Discord's side.
     */
    export async function clearCommands() {
        isLoaded = false;
        MAPPED_COMMANDS.clear();
        NAME_TO_COMMAND.clear();
    }

    /**
     * Gets the command object by its name.
     *
     * @param {string} commandName The command name.
     * @returns {BaseCommand | null} The command object, if found.
     */
    export function getCommandByName(commandName: string): BaseCommand | null {
        return NAME_TO_COMMAND.get(commandName) ?? null;
    }

    /**
     * Gets all commands.
     *
     * @returns {ReadonlyMap} The commands.
     */
    export function getAllCommands(): ReadonlyMap<string, BaseCommand[]> {
        return MAPPED_COMMANDS;
    }
}
