import {
    Collection,
    CommandInteraction,
    Guild,
    GuildMember,
    PermissionString,
    TextBasedChannel,
    User
} from "discord.js";
import {Bot} from "../Bot";
import {SlashCommandBuilder, SlashCommandChannelOption} from "@discordjs/builders";
import { APIApplicationCommandOptionChoice } from "discord-api-types/v10";

export interface ICommandContext {
    /**
     * The guild member that initiated this interaction, if any.
     *
     * @type {GuildMember | null}
     */
    member: GuildMember | null;

    /**
     * The user that initiated this interaction.
     *
     * @type {User}
     */
    user: User;

    /**
     * The guild, if any.
     *
     * @type {Guild | null}
     */
    guild: Guild | null;

    /**
     * The channel where this command was executed.
     *
     * @type {TextBasedChannel}
     */
    channel: TextBasedChannel;

    /**
     * The interaction that led to this command.
     *
     * @type {CommandInteraction}
     */
    interaction: CommandInteraction;
}

export enum ArgumentType {
    String,
    Boolean,
    Channel,
    Integer,
    Mention,
    Number,
    Role,
    User
}

/**
 * Adds an argument to the `SlashCommandBuilder`.
 * @param {SlashCommandBuilder} scb The `SlashCommandBuilder` object.
 * @param {IArgumentInfo} argInfo The argument information.
 * @throws {Error} If an invalid option was somehow provided.
 */
function addArgument(scb: SlashCommandBuilder, argInfo: IArgumentInfo): void {
    const desc = argInfo.shortDesc ?? argInfo.desc.length > 100
        ? argInfo.desc.substring(0, 95) + "..."
        : argInfo.desc;

    const restrictions = argInfo.restrictions;
    switch (argInfo.type) {
        case ArgumentType.Boolean: {
            scb.addBooleanOption(o => o.setName(argInfo.argName)
                .setRequired(argInfo.required)
                .setDescription(desc));
            break;
        }
        case ArgumentType.Channel: {
            scb.addChannelOption(o => {
                o.setName(argInfo.argName)
                    .setRequired(argInfo.required)
                    .setDescription(desc);

                restrictions && restrictions.channelModifier && restrictions.channelModifier(o);
                return o;
            });
            break;
        }
        case ArgumentType.Role: {
            scb.addRoleOption(o => o.setName(argInfo.argName)
                .setRequired(argInfo.required)
                .setDescription(desc));
            break;
        }
        case ArgumentType.User: {
            scb.addUserOption(o => o.setName(argInfo.argName)
                .setRequired(argInfo.required)
                .setDescription(desc));
            break;
        }
        case ArgumentType.Integer: {
            scb.addIntegerOption(o => {
                o.setName(argInfo.argName)
                    .setRequired(argInfo.required)
                    .setDescription(desc);

                if (typeof restrictions?.integerMin !== "undefined") {
                    o.setMinValue(Math.round(restrictions.integerMin));
                }

                if (typeof restrictions?.integerMax !== "undefined") {
                    o.setMaxValue(Math.round(restrictions.integerMax));
                }

                return o;
            });
            break;
        }
        case ArgumentType.Mention: {
            scb.addMentionableOption(o => o.setName(argInfo.argName)
                .setRequired(argInfo.required)
                .setDescription(desc));
            break;
        }
        case ArgumentType.Number: {
            scb.addNumberOption(o => o.setName(argInfo.argName)
                .setRequired(argInfo.required)
                .setDescription(desc));
            break;
        }
        case ArgumentType.String: {
            scb.addStringOption(o => {
                o.setName(argInfo.argName)
                    .setRequired(argInfo.required)
                    .setDescription(desc);

                restrictions?.stringChoices
                && restrictions.stringChoices.length > 0
                && o.addChoices(...restrictions.stringChoices);

                return o;
            });
            break;
        }
        default: {
            throw new Error("invalid option.");
        }
    }
}

export abstract class BaseCommand {
    /**
     * The command info object.
     * @type {ICommandInfo}
     */
    public readonly commandInfo: ICommandInfo;
    /**
     * The slash command object. Used for slash commands.
     * @type {SlashCommandBuilder}
     */
    public readonly data: SlashCommandBuilder;
    /**
     * A collection of people that are in cooldown for this command. The K represents the ID; the V represents the
     * the time when the cooldown expires.
     * @type {Collection<string, number>}
     */
    protected readonly onCooldown: Collection<string, number>;
    private readonly activeGuildUsers: Collection<string, Set<string>>;

    /**
     * Creates a new `BaseCommand` object.
     * @param {ICommandInfo} cmi The command information object.
     * @param {SlashCommandBuilder} [slashCmdBuilder] The slash command object. If none is specified, this will
     * create a new `SlashCommandBuilder` instance with the specified name, description, and arguments (specified by
     * the `argumentInfo` array). If you need more control over the arguments (e.g. maximum/minimum), pass your own
     * instance.
     * @throws {Error} If the command doesn't have any way to be called, or doesn't have a description, or doesn't
     * have a name.
     * @throws {Error} If the command's `name` or `description` doesn't match the specified command information's
     * `botCommandName` or `description`, respectively.
     * @protected
     */
    protected constructor(cmi: ICommandInfo, slashCmdBuilder?: SlashCommandBuilder) {
        if (!cmi.botCommandName || !cmi.formalCommandName || !cmi.description)
            throw new Error(`"${cmi.formalCommandName}" does not have any way to be called.`);

        if (slashCmdBuilder) {
            if (slashCmdBuilder.name !== cmi.botCommandName)
                throw new Error(`"${cmi.botCommandName}" does not have matching command names w/ slash command.`);

            if (slashCmdBuilder.description !== cmi.description)
                throw new Error(`"${cmi.botCommandName}" does not have matching description w/ slash command.`);
        }

        this.commandInfo = cmi;
        if (slashCmdBuilder) {
            this.data = slashCmdBuilder;
        }
        else {
            this.data = new SlashCommandBuilder()
                .setName(cmi.botCommandName)
                .setDescription(
                    cmi.description.length > 100
                        ? cmi.description.substring(0, 96) + "..."
                        : cmi.description
                );

            cmi.argumentInfo.filter(x => x.required).forEach(requiredArg => {
                addArgument(this.data, requiredArg);
            });

            // Optional arguments always goes last.
            cmi.argumentInfo.filter(x => !x.required).forEach(optionalArg => {
                addArgument(this.data, optionalArg);
            });
        }

        this.onCooldown = new Collection<string, number>();
        this.activeGuildUsers = new Collection<string, Set<string>>();
    }

    /**
     * Executes a command. This promise should be resolved when the command is "done" running.
     * @param {ICommandContext} ctx The command context.
     * @return {Promise<number>} The command result. 0 implies successful execution. Any other number implies
     * non-successful execution.
     */
    public abstract run(ctx: ICommandContext): Promise<number>;

    /**
     * Checks to see if the specified person is on cooldown.
     * @param {User | GuildMember} userToTest Whether the person is on cooldown.
     * @return {number} The amount of time, in milliseconds, left before the person can run this command. `-1` if
     * there is no cooldown or the person isn't on cooldown.
     */
    public checkCooldownFor(userToTest: User | GuildMember): number {
        // Check if the person is on cooldown.
        if (this.commandInfo.commandCooldown > 0 && this.onCooldown.has(userToTest.id))
            return this.onCooldown.get(userToTest.id) as number - Date.now();

        return -1;
    }

    /**
     * Adds a person to the command cooldown. If the person is already on cooldown, then this will not update the
     * person's cooldown status.
     * @param {User | GuildMember} userToAdd The user to add.
     */
    public addToCooldown(userToAdd: User | GuildMember): void {
        if (this.commandInfo.commandCooldown <= 0) return;
        if (this.onCooldown.has(userToAdd.id)) return;
        this.onCooldown.set(userToAdd.id, Date.now() + this.commandInfo.commandCooldown);
        setTimeout(() => this.onCooldown.delete(userToAdd.id), this.commandInfo.commandCooldown);
    }

    /**
     * Checks whether a user can run a command. This is ideal when testing permissions; not so much other things.
     * @param {User | GuildMember} userToTest The user to test.
     * @param {Guild | null} guild The guild.
     * @return {ICanRunResult} Results about whether a person can run this command.
     * @throws {Error} If the command has invalid role permissions defined.
     */
    public hasPermissionToRun(userToTest: User | GuildMember, guild: Guild | null): ICanRunResult {
        const results: ICanRunResult = {
            canRun: false,
            hasAdmin: false,
            missingBotPerms: [],
            missingUserPerms: [],
            reason: ""
        };

        // If the command is bot owner only and the person isn't a bot owner, then this person can't run this command.
        if (this.commandInfo.botOwnerOnly && !Bot.BotInstance.config.botOwnerIds.includes(userToTest.id))
            return results;

        // The person tried to run the command in DMs. See if the person can do so.
        // If a command can be run in DMs, then there should not be any permission requirements, so we don't check
        // those at all.
        if (!guild) {
            if (this.commandInfo.guildOnly)
                return results;

            results.canRun = true;
            return results;
        }

        // At this point, we know we are in a guild.
        // So userToTest better be a GuildMember.
        if (userToTest instanceof User)
            return results;

        if (this.commandInfo.allowOnServers && !this.commandInfo.allowOnServers.includes(guild.id)) {
            results.reason = "Your server is not allowed to run this command.";
            return results;
        }

        // Command was executed in the server. We need to check permissions.
        const bot = guild.me;

        // Check bot permissions.
        if (bot) {
            const botPerms = bot.permissions.toArray();
            if (!bot.permissions.has("ADMINISTRATOR")) {
                // Go through each required bot permission.
                for (const perm of this.commandInfo.botPermissions) {
                    // If the bot doesn't have the specified permission, then add it to the list of missing
                    // permissions.
                    if (!botPerms.includes(perm))
                        results.missingBotPerms.push(perm);
                }
            }
        }

        // If you have full Administrator, you can run this command (if the bot can)
        if (userToTest.permissions.has("ADMINISTRATOR")) {
            // Check to make sure the bot can run the command.
            results.canRun = results.missingBotPerms.length === 0;
            results.hasAdmin = true;
            return results;
        }

        if (Bot.BotInstance.config.botOwnerIds.includes(userToTest.id)) {
            results.canRun = results.missingBotPerms.length === 0;
            return results;
        }

        // If no user permissions are defined whatsoever, then the person can run the command.
        if (this.commandInfo.generalPermissions.length === 0) {
            results.canRun = results.missingBotPerms.length === 0;
            return results;
        }

        // Check user permissions.
        const myPerms = userToTest.permissions.toArray();
        for (const perm of this.commandInfo.generalPermissions) {
            if (!myPerms.includes(perm)) {
                results.missingUserPerms.push(perm);
            }
        }

        results.canRun = results.missingBotPerms.length === 0 && results.missingUserPerms.length === 0;
        return results;
    }
}

interface ICanRunResult {
    canRun: boolean;
    hasAdmin: boolean;
    missingUserPerms: string[];
    missingBotPerms: string[];
    reason: string;
}

export interface ICommandInfo {
    /**
     * An identifier for this command.
     * @type {string}
     */
    cmdCode: string;

    /**
     * The formal, human-readable, command name.
     * @type {string}
     */
    formalCommandName: string;

    /**
     * The way a user would call this command.
     * @type {string}
     */
    botCommandName: string;

    /**
     * A description of what this command does.
     * @type {string}
     */
    description: string;

    /**
     * Information about the arguments.
     * @type {IArgumentInfo[]}
     */
    argumentInfo: IArgumentInfo[];

    /**
     * A cooldown, in milliseconds, that users will have to wait out after executing a command.
     * @type {number}
     */
    commandCooldown: number;

    /**
     * An array of server IDs for which this command should be allowed to run on. In other words, if a command is
     * executed in a server whose ID doesn't appear in this array, then the command will not run.
     *
     * Set this to undefined if the command should be allowed to run on all servers.
     *
     * @type {string[]}
     */
    allowOnServers?: string[];

    /**
     * The general permissions that the user must have to execute the command.
     * @type {PermissionString[]}
     */
    generalPermissions: PermissionString[];

    /**
     * The permissions that a bot must have to execute this command.
     * @type {PermissionString[]}
     */
    botPermissions: PermissionString[];

    /**
     * Whether the command is for a server only.
     * @type {boolean}
     */
    guildOnly: boolean;

    /**
     * Whether the command is for the bot owner only.
     * @type {boolean}
     */
    botOwnerOnly: boolean;
}

export interface IArgumentInfo {
    /**
     * The formal name of the argument.
     */
    displayName: string;

    /**
     * The displayed name (what is shown in Discord's slash command) of the argument.
     * @type {string}
     */
    argName: string;

    /**
     * The argument type.
     * @type {string}
     */
    type: ArgumentType;

    /**
     * Any restrictions. This depends on the `type`.
     * @type {object}
     */
    restrictions?: {
        /**
         * What choices should be available if the type is String. This is a tuple where:
         * - the first value is the displayed value.
         * - the second value is the actual value.
         *
         * @type {[string, string][]}
         */
         stringChoices?: APIApplicationCommandOptionChoice<string>[]; 

        /**
         * A function to modify the slash channel options; a common use would be to specify the types of channels that
         * this command can run under. Note that because this library sucks, I have to do this.
         * @param {SlashCommandChannelOption} o The slash command channel options.
         * @returns {SlashCommandChannelOption} The slash command channel options.
         */
        channelModifier?: (o: SlashCommandChannelOption) => SlashCommandChannelOption;

        /**
         * The minimum number, if the type is Integer.
         * @type {number}
         */
        integerMin?: number;

        /**
         * The maximum number, if the type is Integer.
         * @type {number}
         */
        integerMax?: number;
    };

    /**
     * The argument type, formatted as a string which will then be displayed to the end user.
     * @type {string}
     */
    prettyType: string;

    /**
     * The description of this argument.
     * @type {string}
     */
    desc: string;

    /**
     * A shortened description of this argument. If none is provided, this defaults to the first 100 characters of
     * the specified description.
     * @type {string}
     */
    shortDesc?: string;

    /**
     * Examples of how this argument can be satisfied.
     */
    example: string[];

    /**
     * Whether the argument is required.
     * @type {boolean}
     */
    required: boolean;
}