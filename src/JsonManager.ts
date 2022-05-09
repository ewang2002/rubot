import * as path from "path";
import {JsonArrayFile} from "./JsonArrayFile";

export namespace JsonManager {
    // DadBot tracker.
    const DAD_JSON_PATH: string = path.join(__dirname, "..", "dad.json");
    export interface IDadTracker {
        id: string;
        percent: number;
    }
    export let DadJsonFile: JsonArrayFile<IDadTracker>;


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
        DadJsonFile = new JsonArrayFile<IDadTracker>(DAD_JSON_PATH, []);
        QuoteJsonFile = new JsonArrayFile<IQuote>(QUOTE_PATH, []);
    }
}