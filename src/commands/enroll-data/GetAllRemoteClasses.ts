import {BaseCommand, ICommandContext} from "../BaseCommand";
import {MutableConstants} from "../../constants/MutableConstants";
import { ArrayUtilities } from "../../utilities/ArrayUtilities";
import { GeneralUtilities } from "../../utilities/GeneralUtilities";
import { GeneralConstants } from "../../constants/GeneralConstants";

export class GetAllRemoteClasses extends BaseCommand {
    public constructor() {
        super({
            cmdCode: "GET_REMOTE_CLASSES",
            formalCommandName: "Get Remote Classes",
            botCommandName: "getremote",
            description: "Gets a list of all remote courses for the current term.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 5 * 1000,
            argumentInfo: [],
            guildOnly: false,
            botOwnerOnly: false
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        await ctx.interaction.deferReply();
        const data = MutableConstants.SECTION_TERM_DATA
            .filter(x => x.meetings.every(y => y.building === "RCLAS"))
            .map(x => `\`${x.subj_course_id}\` (${x.section_code} / ${x.section_id}) - [${x.all_instructors.join(", ")}]\n`);
        const fields = ArrayUtilities.arrayToStringFields(data, (_, elem) => elem);
        const embed = GeneralUtilities.generateBlankEmbed(ctx.user, "RANDOM");
        for (const f of fields) {
            embed.addField(GeneralConstants.ZERO_WIDTH_SPACE, f);
        }
        
        if (data.length === 0) {
            ctx.interaction.editReply({
                content: `**${MutableConstants.CACHED_DATA_TERM}** No classes are remote.`
            });
        }
        else {
            ctx.interaction.editReply({
                embeds: [embed]
            });
        }
        return 0;
    }
}