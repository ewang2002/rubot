import {
    ColorResolvable,
    Guild,
    GuildMember,
    Message,
    MessageActionRow,
    MessageEditOptions,
    MessageEmbed,
    User
} from "discord.js";

export namespace GeneralUtilities {
    /**
     * A simple function that attempts to execute a given synchronous function. This will handle any exceptions that
     * may occur.
     * @param {() => void} func The function to run.
     * @return {T | null} The result, if any. Null otherwise.
     */
    export function tryExecute<T = void>(func: () => T | null): T | null {
        try {
            return func();
        } catch (e) {
            return null;
        }
    }

    /**
     * A simple function that attempts to execute a given asynchronous function. This will handle any exceptions that
     * may occur.
     * @param {() => void} func The function to run.
     * @return {Promise<T | null>} The result, if any. Null otherwise.
     */
    export async function tryExecuteAsync<T = void>(func: () => Promise<T | null>): Promise<T | null> {
        try {
            return await func();
        } catch (e) {
            return null;
        }
    }

    /**
     * Creates a blank embed with the author and color set.
     * @param {User | GuildMember | Guild} obj The user, guild member, or guild to show in the author section of the
     * embed.
     * @param {ColorResolvable} color The color of this embed.
     * @returns {MessageEmbed} The new embed.
     */
    export function generateBlankEmbed(obj: User | GuildMember | Guild,
                                       color: ColorResolvable = "RANDOM"): MessageEmbed {
        const embed = new MessageEmbed().setTimestamp().setColor(color);
        if (obj instanceof User)
            embed.setAuthor({name: obj.tag, iconURL: obj.displayAvatarURL()});
        else if (obj instanceof GuildMember)
            embed.setAuthor({name: obj.displayName, iconURL: obj.user.displayAvatarURL()});
        else {
            const icon = obj.iconURL();
            if (icon) embed.setAuthor({name: obj.name, iconURL: icon});
            else embed.setAuthor({name: obj.name});
        }

        return embed;
    }

    /**
     * Gets the `MessageOptions` object from a message.
     * @param {Message} msg The message.
     * @param {MessageActionRow[]} components The components, if any.
     * @return {MessageOptions} The new `MessageOptions`.
     */
    export function getMessageOptionsFromMessage(
        msg: Message,
        components?: MessageActionRow[]
    ): MessageEditOptions & {split?: false | undefined} {
        const obj: MessageEditOptions & {split?: false | undefined} = {
            components: []
        };
        if (msg.content)
            obj.content = msg.content;
        if (msg.embeds.length !== 0)
            obj.embeds = msg.embeds;
        if (msg.attachments.size !== 0)
            obj.files = Array.from(msg.attachments.values());
        if (msg.components.length === 0)
            obj.components = components;
        else
            obj.components = msg.components;

        return obj;
    }

    /**
     * Stops execution of a function for a specified period of time.
     * @param {number} time The time, in milliseconds, to delay execution.
     * @returns {Promise<void>}
     */
    export async function stopFor(time: number): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                return resolve();
            }, time);
        });
    }
}