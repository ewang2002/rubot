export namespace StringUtil {
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

        for (let i = 0, o = 0; i < numChunks; ++i, o += size)
            chunks[i] = str.substr(o, size);

        return chunks;
    }

    /**
     * Parses a string containing numbers separated by a comma or space.
     * @param {string} str The string.
     * @returns {number[]} The numbers.
     */
    export function parseNumbers(str: string): number[] {
        const finalArr = new Set<number>();
        const initStr = str.split(/, |,| /);
        for (const elem of initStr) {
            if (elem.includes("-") && elem.substring(elem.indexOf("-") + 1).length > 0) {
                const [a, b] = elem.split("-");
                const aNum = Number.parseInt(a, 10);
                const bNum = Number.parseInt(b, 10);
                if (Number.isNaN(aNum) || Number.isNaN(bNum))
                    continue;

                if (aNum >= bNum) {
                    finalArr.add(aNum);
                    continue;
                }

                for (let i = aNum; i <= bNum; i++)
                    finalArr.add(i);

                continue;
            }

            const num = Number.parseInt(elem, 10);
            if (Number.isNaN(num))
                continue;

            finalArr.add(num);
        }

        return Array.from(finalArr);
    }
}