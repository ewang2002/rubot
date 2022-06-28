import * as path from "path";
import {JsonArrayFile} from "./JsonArrayFile";

export namespace JsonManager {
    // Quote tracker.
    const QUOTE_PATH: string = path.join(__dirname, "..", "quote.json");
    export interface IQuote {
        text: string;
        author: {
            name: string;
            fromMention: boolean;
        };
    }
    export let QuoteJsonFile: JsonArrayFile<IQuote>;

    /**
     * Creates all JsonArrayFile instances.
     */
    export function startAll(): void {
        QuoteJsonFile = new JsonArrayFile<IQuote>(QUOTE_PATH, []);
    }
}