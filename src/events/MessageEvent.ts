import {Message} from "discord.js";
import {GeneralConstants} from "../constants/GeneralConstants";
import {DadHelper} from "../DadHelper";
import {GeneralUtilities} from "../utilities/GeneralUtilities";

export async function onMessage(msg: Message): Promise<void> {
    if (msg.author.bot || !msg.guild || msg.guild.id !== GeneralConstants.DOOMERS_SERVER_ID) {
        return;
    }

    const idx = DadHelper.ALL_ACTIVE_TRACKERS.findIndex(x => x.id === msg.author.id);
    if (idx === -1 || DadHelper.ALL_ACTIVE_TRACKERS[idx].percent === 0) {
        return;
    }

    if (!GeneralConstants.IM_REGEX.test(msg.content)) {
        return;
    }

    const possName = msg.content.split(GeneralConstants.IM_REGEX).at(-1)!.trim();
    if (possName.length === 0 || Math.random() > DadHelper.ALL_ACTIVE_TRACKERS[idx].percent) {
        return;
    }

    await GeneralUtilities.tryExecuteAsync(async () => {
        await msg.reply({
            content: `Hi ${possName}`
        });
    });
}