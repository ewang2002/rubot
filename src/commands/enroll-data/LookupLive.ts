import BaseCommand, { ICommandContext } from "../BaseCommand";
import {
    displayInteractiveWebregData,
    LOOKUP_ARGUMENTS,
    parseCourseSubjCode,
    requestFromWebRegApi,
} from "./helpers/Helper";
import { Data } from "../../Data";

export default class LookupLive extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "LOOKUP_COURSE",
            formalCommandName: "Lookup Course on WebReg",
            botCommandName: "lookuplive",
            description:
                "Looks up a course on WebReg live. This will only get the course information for the term" +
                " with the active enrollment period.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: LOOKUP_ARGUMENTS,
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const term =
            ctx.interaction.options.getString("term", false) ?? Data.DEFAULT_TERM;
        const code = ctx.interaction.options.getString("course_subj_num", true);

        const json = await requestFromWebRegApi(ctx, term, code);
        // Already handled for us.
        if (!json) {
            return -1;
        }

        const parsedCode = parseCourseSubjCode(code);
        await displayInteractiveWebregData(ctx, json, term, parsedCode, true);
        return 0;
    }
}
