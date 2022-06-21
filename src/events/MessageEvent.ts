import {Message} from "discord.js";
import {GeneralConstants} from "../constants/GeneralConstants";
import {GeneralUtilities} from "../utilities/GeneralUtilities";
import {JsonManager} from "../JsonManager";

const RECENT_IM: Set<string> = new Set<string>();

export async function onMessage(msg: Message): Promise<void> {
    if (msg.author.bot || !msg.guild || !GeneralConstants.PERMITTED_SERVER_IDS.includes(msg.guild.id)) {
        return;
    }

    const currTracked = JsonManager.DadJsonFile.getCachedData();
    const idx = currTracked.findIndex(x => x.id === msg.author.id);
    if (idx === -1 || currTracked[idx].percent === 0) {
        return;
    }

    const possName = msg.content.split(GeneralConstants.IM_REGEX).at(-1)!.trim();
    if (possName.length === 0 || Math.random() > currTracked[idx].percent || possName === msg.content.trim()) {
        return;
    }

    await GeneralUtilities.tryExecuteAsync(async () => {
        await msg.reply({
            content: `Hi ${possName}`
        });
    });
}