import BaseCommand, { ICommandContext, RequiredElevatedPermission } from "../BaseCommand";
import {
    displayInteractiveWebregData,
    LOOKUP_ARGUMENTS,
    parseCourseSubjCode,
    requestFromWebRegApi,
    WebRegDisplayData,
} from "./helpers/Helper";
import { DataRegistry } from "../../DataRegistry";
import { ScraperApiWrapper } from "../../utilities";

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
            elevatedPermReq: RequiredElevatedPermission.None
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const term = ctx.interaction.options.getString("term", false) 
            ?? DataRegistry.DEFAULT_TERM;
        const code = ctx.interaction.options.getString("course_subj_num", true);

        const json = await requestFromWebRegApi(ctx, term, code);
        // Already handled for us.
        if (!json) {
            return -1;
        }

        // This code should be formatted properly since the above `requestFromWebRegApi`
        // function checked that.
        const parsedCode = parseCourseSubjCode(code);
        const [subj, num] = parsedCode.split(" ");
        
        const data: WebRegDisplayData = {
            sections: json
        };

        const courseNote = await ScraperApiWrapper.getInstance()
            .getCourseNoteForClass(term, subj, num);
        if (ScraperApiWrapper.checkOkResponse(courseNote)) {
            data.courseNotes = courseNote;
        }

        const sectionNote = await ScraperApiWrapper.getInstance()
            .getSectionNoteForClass(term, subj, num);
        if (ScraperApiWrapper.checkOkResponse(sectionNote)) {
            data.sectionNotes = sectionNote;
        }

        await displayInteractiveWebregData(ctx, data, term, parsedCode, true);
        return 0;
    }
}
