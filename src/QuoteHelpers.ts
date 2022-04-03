import * as fs from "fs";
import * as path from "path";
import {ArrayUtilities} from "./utilities/ArrayUtilities";
import {TimeUtilities} from "./utilities/TimeUtilities";

/**
 * Some functions & interfaces that are used to manage quotes.
 */
export namespace QuoteHelpers {
    const QUOTE_PATH: string = path.join(__dirname, "..", "quote.json");

    // A potential issue here is that two users could request to add a quote at the same exact time. When
    // the program tries to write both quotes to the same file at the same time, due to potential data race
    // issues, the file might get reset.
    //
    // To ensure no potential data race conditions will happen, we make use of a queue. Every second, we
    // take an element out of the queue and add it to the file.
    const QUOTE_QUEUE: {
        quote: IQuote;
        resolver: (value: (boolean | PromiseLike<boolean>)) => void
    }[] = [];

    export interface IQuote {
        text: string;
        author: {
            name: string;
            fromMention: boolean;
        };
    }

    /**
     * Starts the quote queue checker.
     */
    export function start(): void {
        if (!fs.existsSync(QUOTE_PATH)) {
            fs.writeFileSync(QUOTE_PATH, JSON.stringify([]));
        }

        setInterval(() => {
            if (QUOTE_QUEUE.length === 0) {
                return;
            }

            const {quote, resolver} = QUOTE_QUEUE.shift()!;
            const allQuotes = getAllQuotes();
            allQuotes.push(quote);
            fs.writeFileSync(QUOTE_PATH, JSON.stringify(allQuotes));
            resolver(true);
            console.info(`[${TimeUtilities.getDateTime()}] Saved quote.`);
        }, 1000);
    }

    /**
     * Gets all quotes.
     * @returns {IQuote[]} All quotes.
     */
    export function getAllQuotes(): IQuote[] {
        const quoteFile = fs.readFileSync(QUOTE_PATH);
        return JSON.parse(quoteFile.toString());
    }

    /**
     * Writes a single quote to the JSON file.
     * @param {QuoteHelpers.IQuote} quote The quote.
     * @returns {Promise<boolean>>} Whether this was successful.
     */
    export async function writeToQuoteJson(quote: IQuote): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            QUOTE_QUEUE.push({
                quote,
                resolver: resolve
            });
        });
    }

    /**
     * Gets a random quote from the quote file.
     * @returns {IQuote | null} The random quote, if any. `null` if the file is empty.
     */
    export function getRandomQuote(): IQuote | null {
        const json = getAllQuotes();
        return json.length === 0
            ? null
            : ArrayUtilities.getRandomElement(json);
    }
}