import { BaseCommand, ICommandContext } from "../BaseCommand";
import { MutableConstants } from "../../constants/MutableConstants";
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
        const remoteClasses: { [course: string]: Set<string> } = {};
        MutableConstants.SECTION_TERM_DATA
            // We don't want classes whose meetings are ALL TBA
            .filter(x => !x.meetings.every(y => y.building === "TBA"))
            // but if it has at least one RCLAS and at least one TBA and no other buildings,
            // then we can assume it's a remote course
            .filter(x => x.meetings.every(y => y.building === "RCLAS" || y.building === "TBA"))
            .forEach(d => {
                if (!(d.subj_course_id in remoteClasses)) {
                    remoteClasses[d.subj_course_id] = new Set();
                }

                // If this is a letter
                if (Number.isNaN(Number.parseInt(d.section_code[0], 10))) {
                    remoteClasses[d.subj_course_id].add(d.section_code[0]);
                }
                else {
                    remoteClasses[d.subj_course_id].add(d.section_code);
                }
            });

        const entries = [];
        let ct = 0;
        for (const k in remoteClasses) {
            entries.push(
                `**${k}**: \`[${Array.from(remoteClasses[k]).join(", ")}]\`\n`
            );
            ++ct;
        }

        const fields = ArrayUtilities.arrayToStringFields(entries, (_, elem) => elem);
        const embed = GeneralUtilities.generateBlankEmbed(ctx.user, "RANDOM")
            .setTitle(`Fully Remote Courses in **${MutableConstants.CACHED_DATA_TERM}**`)
            .setDescription(`There are \`${ct}\` fully remote courses offered this term.`);
        for (const f of fields) {
            embed.addField(GeneralConstants.ZERO_WIDTH_SPACE, f);
        }

        ctx.interaction.editReply({
            embeds: [embed]
        });
        return 0;
    }
}