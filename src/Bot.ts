import { Client, Collection, GatewayIntentBits, Interaction, Partials } from "discord.js";
import * as Cmds from "./commands";
import { onErrorEvent, onInteractionEvent, onReadyEvent } from "./events";
import { REST } from "@discordjs/rest";
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord-api-types/v10";
import { Data } from "./Data";

export class Bot {
    /**
     * The bot instance.
     * @type {Bot}
     */
    public static BotInstance: Bot;

    /**
     * All commands. The key is the category name and the value is the array of commands.
     * @type {Collection<string, BaseCommand[]>}
     */
    public static Commands: Collection<string, Cmds.BaseCommand[]>;

    /**
     * All commands. The key is the name of the command (essentially, the slash command name) and the value is the
     * command object.
     *
     * **DO NOT MANUALLY POPULATE THIS OBJECT.**
     *
     * @type {Collection<string, BaseCommand>}
     */
    public static NameCommands: Collection<string, Cmds.BaseCommand>;

    /**
     * All commands. This is sent to Discord for the purpose of slash commands.
     *
     * **DO NOT MANUALLY POPULATE THIS OBJECT.**
     *
     * @type {object[]}
     */
    public static JsonCommands: RESTPostAPIApplicationCommandsJSONBody[];
    public static Rest: REST;
    private readonly _bot: Client;
    private _eventsIsStarted: boolean = false;
    public readonly instanceStarted: Date;

    /**
     * Constructs a new Discord bot.
     *
     * @param {string} token The bot's token.
     * @throws {Error} If a command name was registered twice or if `data.name` is not equal to `botCommandName`.
     */
    public constructor(token: string) {
        Bot.BotInstance = this;
        this.instanceStarted = new Date();
        this._bot = new Client({
            partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
        });
        Bot.Commands = new Collection<string, Cmds.BaseCommand[]>();
        Bot.Commands.set("General", [
            new Cmds.Help(),
            new Cmds.Ping(),
            new Cmds.Status(),
            new Cmds.DidItBreak(),
            new Cmds.LoginScriptStats(),
        ]);

        Bot.Commands.set("Doomers Only", [new Cmds.SetActivity(), new Cmds.Role()]);

        Bot.Commands.set("Enrollment Data", [
            new Cmds.GetOverallEnroll(),
            new Cmds.GetSectionEnroll(),
            new Cmds.LookupLive(),
            new Cmds.GetCape(),
            new Cmds.LookupCached(),
            new Cmds.LiveSeats(),
            new Cmds.GetPrereq(),
            new Cmds.LiveSeatLegends(),
            new Cmds.SearchCourse(),
        ]);

        Bot.Commands.set("UCSD", [
            new Cmds.ViewAllClassrooms(),
            new Cmds.CheckRoom(),
            new Cmds.Waitz(),
            new Cmds.CourseInfo(),
            new Cmds.FreeRooms(),
        ]);

        Bot.Commands.set("Owner Only", [new Cmds.Exec()]);

        Bot.JsonCommands = [];
        Bot.NameCommands = new Collection<string, Cmds.BaseCommand>();
        Bot.Rest = new REST({ version: "10" }).setToken(token);
        for (const command of Array.from(Bot.Commands.values()).flat()) {
            Bot.JsonCommands.push(command.data.toJSON() as RESTPostAPIApplicationCommandsJSONBody);

            if (command.data.name !== command.commandInfo.botCommandName) {
                throw new Error(
                    `Names not matched: "${command.data.name}" - "${command.commandInfo.botCommandName}"`
                );
            }

            if (Bot.NameCommands.has(command.data.name)) {
                throw new Error(`Duplicate command "${command.data.name}" registered.`);
            }

            Bot.NameCommands.set(command.data.name, command);
        }
    }

    /**
     * Returns the Discord client.
     *
     * @returns {Client} The client.
     */
    public get client(): Client {
        return this._bot;
    }

    /**
     * Defines all necessary events for the bot to work.
     */
    public startAllEvents(): void {
        if (this._eventsIsStarted) {
            return;
        }

        this._bot.on("ready", () => onReadyEvent());
        this._bot.on("interactionCreate", (i: Interaction) => onInteractionEvent(i));
        this._bot.on("error", (e: Error) => onErrorEvent(e));
        this._eventsIsStarted = true;
    }

    /**
     * Logs into the bot and connects to the database.
     */
    public async login(): Promise<void> {
        if (!this._eventsIsStarted) {
            this.startAllEvents();
        }

        await this._bot.login(Data.CONFIG.discord.token);

        if (Data.CONFIG.isProd) {
            await Bot.Rest.put(Routes.applicationCommands(Data.CONFIG.discord.clientId), {
                body: Bot.JsonCommands,
            });
        }
        else {
            await Promise.all(
                this._bot.guilds.cache.map(async (guild) => {
                    await Bot.Rest.put(
                        Routes.applicationGuildCommands(Data.CONFIG.discord.clientId, guild.id),
                        { body: Bot.JsonCommands }
                    );
                })
            );
        }
    }
}
