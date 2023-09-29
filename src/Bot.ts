import { Client, GatewayIntentBits, Interaction, Partials } from "discord.js";
import { onErrorEvent, onInteractionEvent, onReadyEvent } from "./events";
import { REST } from "@discordjs/rest";
import { CommandRegistry } from "./commands";

export class Bot {
    /**
     * The bot instance.
     * @type {Bot}
     */
    public static BotInstance: Bot;

    /**
     * The REST client used to make requests to Discord's API.
     */
    public static Rest: REST;

    /**
     * When the bot was started.
     */
    public readonly instanceStarted: Date;

    private readonly _bot: Client;
    private _eventsIsStarted: boolean = false;
    private readonly _token: string;
    private readonly _clientId: string;


    /**
     * Constructs a new Discord bot.
     *
     * @param {string} token The bot's token.
     * @throws {Error} If a command name was registered twice or if `data.name` is not equal to `botCommandName`.
     */
    public constructor(clientId: string, token: string) {
        this._token = token;
        this._clientId = clientId;
        Bot.Rest = new REST({ version: "10" }).setToken(token);
        Bot.BotInstance = this;
        this.instanceStarted = new Date();
        this._bot = new Client({
            partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
        });
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
     * Logs into the bot, making it usable.
     * 
     * @param {string[]} [guildIds] Whether to load commands for the specified guilds only.
     */
    public async login(guildIds?: string[]): Promise<void> {
        if (!this._eventsIsStarted) {
            this.startAllEvents();
        }

        await CommandRegistry.loadCommands();
        await CommandRegistry.registerCommands(this._bot, Bot.Rest, this._clientId, guildIds);
        await this._bot.login(this._token);
    }
}
