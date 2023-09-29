import BaseCommand, { ICommandContext } from "../BaseCommand";
import { WebRegSection } from "../../definitions";
import { GeneralUtilities, ScraperApiWrapper, ScraperResponse } from "../../utilities";
import { DataRegistry } from "../../DataRegistry";

export default class DidItBreak extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "DID_IT_BREAK",
            formalCommandName: "Did It Break",
            botCommandName: "didscraperbreak",
            description: "Checks if my scrapers are down.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 3 * 1000,
            argumentInfo: [],
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const errored = [];
        for await (const data of DataRegistry.CONFIG.ucsdInfo.currentWebRegTerms) {
            const json: ScraperResponse<WebRegSection[]> = await ScraperApiWrapper.getInstance()
                .getCourseInfo(data.term, "CSE", "8A");

            if (!json || "error" in json) {
                errored.push(data.term);
            }

            await GeneralUtilities.stopFor(500);
        }

        if (errored.length === 0) {
            await ctx.interaction.reply({
                content: "No.",
            });

            return 0;
        }

        await ctx.interaction.reply({
            content: `Yes, go fix: \`[${errored.join(", ")}]\``,
        });

        return 0;
    }
}
