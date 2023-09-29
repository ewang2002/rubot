import { EmojiConstants } from "../Constants";
import { ArrayUtilities } from "./ArrayUtilities";
import { StringBuilder } from "./StringBuilder";

export namespace StringUtil {
    const ALL_CHARACTERS: string[] = [
        ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
        ..."abcdefghijklmnopqrstuvwxyz".split(""),
        ..."0123456789".split("")
    ];

    /**
     * Generates a random string.
     * @param {number} amt The length of the string.
     * @return {string} The random string.
     */
    export function generateRandomString(amt: number): string {
        const sb = new StringBuilder();
        for (let i = 0; i < amt; ++i) {
            sb.append(ArrayUtilities.getRandomElement(ALL_CHARACTERS));
        }
        return sb.toString();
    }

    /**
     * Adds three backticks (`) to the front and end of the string.
     * @param {T} content The content to add backticks to.
     * @return {string} The new string.
     * @typedef T
     */
    export function codifyString<T>(content: T): string {
        return "```\n" + content + "```";
    }

    /**
     * Breaks a string into substrings, each with size at most specified by `size`.
     * @param {string} str The string.
     * @param {number} size The size per substring.
     * @return {string[]} The string array.
     */
    export function breakStringIntoChunks(str: string, size: number): string[] {
        const numChunks = Math.ceil(str.length / size);
        const chunks = new Array(numChunks);

        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substr(o, size);
        }

        return chunks;
    }

    /**
     * Gets a progress bar in the form of square emojis.
     * @param {number} numSquares The number of squares.
     * @param {number} percent The percent of squares to fill as green, yellow, or red. Green for <50%, yellow for
     * 50-80%, and red for >80%.
     * @return {string} The formatted string.
     */
    export function getEmojiProgressBar(numSquares: number, percent: number): string {
        let numPut = 0;
        let returnStr = "";

        let compEmojiUsed;
        if (percent < 0.5) {
            compEmojiUsed = EmojiConstants.GREEN_SQUARE_EMOJI;
        }
        else if (percent < 0.8) {
            compEmojiUsed = EmojiConstants.YELLOW_SQUARE_EMOJI;
        }
        else {
            compEmojiUsed = EmojiConstants.RED_SQUARE_EMOJI;
        }

        for (let i = 0; i < Math.min(Math.floor(percent * numSquares), numSquares); i++) {
            returnStr += compEmojiUsed;
            numPut++;
        }

        for (let i = 0; i < numSquares - numPut; i++) {
            returnStr += EmojiConstants.BLACK_SQUARE_EMOJI;
        }

        return returnStr;
    }
}
