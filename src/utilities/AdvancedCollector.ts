import { ModalActionRowComponentBuilder, SelectMenuBuilder } from "@discordjs/builders";
import {
    GuildMember,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    MessageCollector,
    MessageComponentInteraction,
    StringSelectMenuBuilder,
    User,
    ComponentType,
    BaseMessageOptions,
    ModalSubmitInteraction,
    ModalBuilder,
    TextInputBuilder,
    ChatInputCommandInteraction,
} from "discord.js";
import { ValidTextChannelType } from "../commands";
import { GeneralUtilities } from "./GeneralUtilities";
import { StringUtil } from "./StringUtilities";

/**
 * A series of helpful collector functions.
 */
export namespace AdvancedCollector {
    const MAX_ACTION_ROWS: number = 5;

    interface ICollectorBaseArgument {
        readonly targetChannel: ValidTextChannelType;
        readonly targetAuthor: User | GuildMember;
        readonly duration: number;

        /**
         * The message options. If defined, this will send a message. If not defined, you must have `oldMsg` set to a
         * message. If you plan on using any interactions, provide them through here.
         */
        msgOptions?: BaseMessageOptions;

        /**
         * If defined, uses an old message instead of sending a new one.
         */
        oldMsg?: Message;

        /**
         * Deletes the message after the collector expires.
         */
        deleteBaseMsgAfterComplete: boolean;
    }

    interface IInteractionBase extends ICollectorBaseArgument {
        /**
         * Whether to acknowledge the interaction immediately after someone clicks it. This will call `deferUpdate`
         * right after the interaction has been used, so the loading state will disappear almost immediately after
         * pressing.
         */
        acknowledgeImmediately: boolean;

        /**
         * Whether to clear the interactions after the collector expires. If set to true, this will edit out the
         * interactions (like buttons, select menu, etc.). Note that if `acknowledgeImmediately` is `false`, then
         * you might still see the "Interaction failed" alert.
         */
        clearInteractionsAfterComplete: boolean;
    }

    interface IMessageCollectorArgument extends ICollectorBaseArgument {
        /**
         * The cancel flag. Any message with the cancel flag as its content will force the method to return "CANCEL_CMD"
         *
         * It should be noted that if this is `null`, then the `cancelFlag` won't be checked at all -- in that case,
         * you will have to provide your own way to cancel the process.
         */
        cancelFlag: string | null;

        /**
         * Whether to delete any messages the author sends (for the collector) after it has been sent or not.
         */
        deleteResponseMessage: boolean;
    }

    /**
     * An interface that represents a modal argument for the coollector.
     */
    interface ITextModalArgument {
        /**
         * The title of the modal.
         * 
         * @type {string}
         */
        readonly modalTitle: string,

        /**
         * The inputs that the user should provide.
         * 
         * @type {TextInputBuilder[]}
         */
        readonly inputs: TextInputBuilder[],

        /**
         * The duration, in milliseconds.
         * 
         * @type {number}
         */
        readonly duration: number;
    }


    /**
     * Sends the text modal to the user, waiting for the user to either provide an answer or for the modal to time out, 
     * and then returns the result of that. 
     * 
     * 
     * Unlike the other collector helper functions, this one is not asynchronous, but takes a callback which gives you
     * the result of the modal submission. The reason why this approach was used is because no event is fired if the 
     * user chooses to press the modal's "Cancel" button. So, if the modal's "Cancel" button is pressed and you had to
     * await the function call, your program would have to wait until the modal collector timed out. If you're using 
     * an interaction menu (e.g., buttons for interactions), those interactions would *not* work until the collector
     * timed out.
     * 
     * 
     * So, with a callback, even if the user presses the "cancel" button, because the function is synchronous, nothing
     * will be "blocked."
     * 
     * 
     * To reiterate, if the user
     * - submits the modal, the callback function will be executed.
     * - presses the "Cancel" button, nothing will happen.
     * 
     * @param interaction The interaction that should be replied to.
     * @param data The modal data. This is the data that will be used in the creation of the modal.
     * @param cb The callback. This will be called only if the user submits the modal. 
     */
    export function sendTextModal(
        interaction: MessageComponentInteraction | ChatInputCommandInteraction,
        data: ITextModalArgument,
        cb: (m: ModalSubmitInteraction) => Promise<void> | void
    ): void {
        const customId = StringUtil.generateRandomString(30) + Date.now();

        const modal = new ModalBuilder()
            .setTitle(data.modalTitle)
            .setCustomId(customId);

        for (const input of data.inputs) {
            modal.addComponents(
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                    .addComponents(input)
            );
        }

        interaction.showModal(modal).then(() => interaction.awaitModalSubmit({
            filter: i => i.customId === customId,
            time: data.duration
        }).then(cb).catch(() => {
            // ignore the timeout error here.
        }));
    }

    /**
     * Starts a message collector. This will wait for one message to be sent that fits the criteria specified by the
     * function parameter and then returns a value based on that message.
     * @param {IMessageCollectorArgument} options The message options.
     * @param {Function} func The function used to filter the message.
     * @returns {Promise<T | null>} The parsed content specified by your filter, or `null` if the collector was
     * stopped due to time or via the "cancel" command.
     * @template T
     */
    export async function startNormalCollector<T>(
        options: IMessageCollectorArgument,
        func: (collectedMsg: Message) => (T | undefined) | Promise<T | undefined>
    ): Promise<T | null> {
        return new Promise(async (resolve) => {
            const cancelFlag = options.cancelFlag;
            const botMsg = await initSendCollectorMessage(options);

            const msgCollector = new MessageCollector(options.targetChannel, {
                filter: (m: Message) => m.author.id === options.targetAuthor.id,
                time: options.duration,
            });

            msgCollector.on("collect", async (c: Message) => {
                if (options.deleteResponseMessage) {
                    await c.delete().catch();
                }

                if (cancelFlag && cancelFlag.toLowerCase() === c.content.toLowerCase()) {
                    return resolve(null);
                }

                const info: T | null = await new Promise(async (res) => {
                    const attempt = await func(c);
                    return res(attempt ? attempt : null);
                });

                if (!info) {
                    return;
                }
                msgCollector.stop();
                resolve(info);
            });

            msgCollector.on("end", (c, r) => {
                if (options.deleteBaseMsgAfterComplete && botMsg && botMsg.deletable) {
                    botMsg.delete().catch();
                }
                if (r === "time") {
                    return resolve(null);
                }
            });
        });
    }

    /**
     * Starts an interaction ephemeral collector. This is essentially the same thing as `startInteractionCollector`,
     * but this works for ephemeral messages or messages that may not necessarily have a message object linked to it.
     *
     * @param {IInteractionBase} options The collector options. This contains a subset of all possible collector
     * options.
     * @param {string} uniqueIdentifier The unique identifier. This should be a string that prepends the actual
     * custom ID of the components. For example, instead of `yes` for the custom ID, use `<uniq_id>_yes`, where
     * `<uniq_id>` is the unique identifier.
     * @returns {Promise<MessageComponentInteraction | null>} The interaction, if available. `null` otherwise.
     */
    export async function startInteractionEphemeralCollector(
        options: Omit<
            IInteractionBase,
            | "msgOptions"
            | "oldMsg"
            | "deleteBaseMsgAfterComplete"
            | "clearInteractionsAfterComplete"
        >,
        uniqueIdentifier: string
    ): Promise<MessageComponentInteraction | null> {
        let returnInteraction: MessageComponentInteraction | null = null;
        try {
            returnInteraction = await options.targetChannel.awaitMessageComponent({
                filter: (i) =>
                    i.user.id === options.targetAuthor.id &&
                    i.customId.startsWith(uniqueIdentifier),
                time: options.duration,
            });

            if (options.acknowledgeImmediately) {
                await returnInteraction.deferUpdate();
            }
        }
        catch (e) {
            // Ignore the error; this is because the collector timed out.
        }

        return returnInteraction;
    }

    /**
     * Starts a general interaction collector. This will wait for the user to interact with one component and then
     * return the result of that component.
     * @param {IInteractionBase} options The collector options.
     * @return {Promise<ButtonInteraction | null>} The interaction, if available. `null` otherwise.
     */
    export async function startInteractionCollector(
        options: IInteractionBase
    ): Promise<MessageComponentInteraction | null> {
        const botMsg = await initSendCollectorMessage(options);
        if (!botMsg) {
            return null;
        }

        let returnInteraction: MessageComponentInteraction | null = null;
        try {
            returnInteraction = await botMsg.awaitMessageComponent({
                filter: (i) => i.user.id === options.targetAuthor.id,
                time: options.duration,
            });

            if (options.acknowledgeImmediately) {
                await returnInteraction.deferUpdate();
            }
        }
        catch (e) {
            // Ignore the error; this is because the collector timed out.
        }
        finally {
            if (options.deleteBaseMsgAfterComplete) {
                await botMsg.delete().catch();
            }
            else if (options.clearInteractionsAfterComplete && botMsg.editable) {
                await botMsg
                    .edit(GeneralUtilities.getMessageOptionsFromMessage(botMsg, []))
                    .catch();
            }
        }

        return returnInteraction;
    }

    /**
     * Starts an interaction and message collector. The first collector to receive something will end both collectors.
     * @param {IInteractionBase & IMessageCollectorArgument} options The collector options.
     * @param {Function} func The function used to filter the message.
     * @return {Promise<ButtonInteraction | T | null>} A `MessageComponentInteraction` if a button is pressed. `T`
     * if the `MessageCollector` is fired. `null` otherwise.
     */
    export async function startDoubleCollector<T>(
        options: IInteractionBase & IMessageCollectorArgument,
        func: (collectedMsg: Message) => (T | undefined) | Promise<T | undefined>
    ): Promise<T | MessageComponentInteraction | null> {
        const cancelFlag = options.cancelFlag;
        const botMsg = await initSendCollectorMessage(options);
        if (!botMsg) {
            return null;
        }

        return new Promise(async (resolve) => {
            const msgCollector = new MessageCollector(options.targetChannel, {
                time: options.duration,
                filter: (m: Message) => m.author.id === options.targetAuthor.id,
            });

            const interactionCollector = botMsg.createMessageComponentCollector({
                filter: (i) => i.user.id === options.targetAuthor.id,
                max: 1,
                time: options.duration,
            });

            msgCollector.on("collect", async (c: Message) => {
                if (options.deleteResponseMessage) {
                    await GeneralUtilities.tryExecuteAsync(async () => {
                        await c.delete();
                    });
                }

                if (cancelFlag && cancelFlag.toLowerCase() === c.content.toLowerCase()) {
                    interactionCollector.stop();
                    return resolve(null);
                }

                const info: T | null = await new Promise(async (res) => {
                    const attempt = await func(c);
                    return res(attempt ?? null);
                });

                if (info === null) {
                    return;
                }
                resolve(info);
                interactionCollector.stop();
                msgCollector.stop();
            });

            interactionCollector.on("collect", async (i) => {
                if (options.acknowledgeImmediately) {
                    await i.deferUpdate();
                }
                resolve(i);
                msgCollector.stop();
            });

            msgCollector.on("end", (c, r) => {
                acknowledgeDeletion(r);
            });

            interactionCollector.on("end", (c, r) => {
                acknowledgeDeletion(r);
            });

            // The end function
            let hasCalled = false;

            function acknowledgeDeletion(r: string): void {
                if (hasCalled) {
                    return;
                }
                hasCalled = true;
                if (options.deleteBaseMsgAfterComplete && botMsg?.deletable) {
                    botMsg?.delete().catch();
                }
                else if (options.clearInteractionsAfterComplete && botMsg?.editable) {
                    botMsg?.edit(GeneralUtilities.getMessageOptionsFromMessage(botMsg, [])).catch();
                }
                if (r === "time") {
                    return resolve(null);
                }
            }
        });
    }

    /**
     * Sends the initial collector message.
     * @param {IInteractionBase} options The options.
     * @return {Promise<Message | null>} The message, or `null`.
     * @private
     */
    async function initSendCollectorMessage(
        options: ICollectorBaseArgument
    ): Promise<Message | null> {
        let botMsg: Message | null = null;
        if (options.msgOptions) {
            botMsg = await GeneralUtilities.tryExecuteAsync<Message>(async () => {
                return await options.targetChannel.send(options.msgOptions!);
            });
        }
        else if (options.oldMsg) {
            botMsg = options.oldMsg;
        }

        return botMsg;
    }

    /**
     * Gets an array of `ActionRowBuilder` from an array of components.
     * @param {BaseMessageComponent[]} options The components.
     * @return {ActionRowBuilder[]} The array of `ActionRowBuilder`.
     */
    export function getActionRowsFromComponents(
        options: (ButtonBuilder | SelectMenuBuilder)[]
    ): ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[] {
        const rows: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[] = [];
        let rowsUsed = 0;

        const selectMenus = options.filter((x) => x.data.type === ComponentType.StringSelect) as StringSelectMenuBuilder[];
        for (let i = 0; i < Math.min(selectMenus.length, MAX_ACTION_ROWS); i++) {
            rows.push(new ActionRowBuilder<SelectMenuBuilder>().addComponents(selectMenus[i]));
            rowsUsed++;
        }

        const buttons = options.filter((x) => x.data.type === ComponentType.Button) as ButtonBuilder[];
        for (let i = 0; i < Math.min(buttons.length, 5 * (MAX_ACTION_ROWS - rowsUsed)); i += 5) {
            const actionRow = new ActionRowBuilder<ButtonBuilder>();
            for (let j = 0; j < 5 && i + j < buttons.length; j++) {
                actionRow.addComponents(buttons[i + j]);
            }

            rows.push(actionRow);
        }

        return rows;
    }
}
