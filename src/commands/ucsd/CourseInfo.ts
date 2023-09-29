import BaseCommand, { ArgumentType, ICommandContext } from "../BaseCommand";
import { EmbedBuilder } from "discord.js";
import { ArrayUtilities, StringUtil } from "../../utilities";
import { parseCourseSubjCode } from "../enroll-data/helpers/Helper";
import { DataRegistry } from "../../DataRegistry";

export default class CourseInfo extends BaseCommand {
    private static TERMS_ALLOWED: string[] = [18, 19, 20, 21, 22].map((x) => x.toString());

    public constructor() {
        super({
            cmdCode: "COURSE_INFO",
            formalCommandName: "Course Information",
            botCommandName: "courseinfo",
            description:
                "Gets information (e.g., description, prerequisites, etc.) about a course.",
            generalPermissions: [],
            botPermissions: [],
            commandCooldown: 2 * 1000,
            argumentInfo: [
                {
                    displayName: "Course & Subject Code",
                    argName: "course_subj_num",
                    type: ArgumentType.String,
                    desc: "The course subject code.",
                    required: true,
                    example: ["CSE 100", "MATH100A"],
                },
            ],
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const code = ctx.interaction.options.getString("course_subj_num", true);
        const parsedCode = parseCourseSubjCode(code);
        if (parsedCode.indexOf(" ") === -1) {
            await ctx.interaction.reply({
                content: `Your input, \`${code}\`, is not correctly formatted. It should look like \`SUBJ XXX\`.`,
                ephemeral: true,
            });

            return -1;
        }

        await ctx.interaction.deferReply();
        const searchRes = DataRegistry.COURSE_LISTING.find((x) => {
            const subjCourseSplit = x.subjCourse.split("/");
            // Case where we might have SUBJ1 NUM1/SUBJ2 NUM2/.../SUBJn NUMn
            if (subjCourseSplit.find((z) => z === parsedCode)) {
                return x;
            }
        });

        if (!searchRes) {
            await ctx.interaction.editReply({
                content: `The course, \`${parsedCode}\`, was not found. Try again.`,
            });

            return -1;
        }

        const profMap: { [name: string]: Set<string> } = {};
        DataRegistry.CAPE_DATA.filter(
            (x) =>
                CourseInfo.TERMS_ALLOWED.some((z) => x.term.endsWith(z)) &&
                x.subjectCourse === parsedCode
        ).forEach((data) => {
            if (!(data.instructor in profMap)) {
                profMap[data.instructor] = new Set<string>();
            }

            profMap[data.instructor].add(data.term);
        });

        // Although we have a list of terms for which they've been teaching the course, we aren't going to use it
        // right now
        const pastProfessors = ArrayUtilities.breakArrayIntoSubsets(
            Object.entries(profMap).map(([profName]) => profName.split(", ").reverse().join(" ")),
            15
        ).map((x) => x.join(", "));

        const historicalOfferings = ArrayUtilities.removeDuplicates(
            DataRegistry.CAPE_DATA.filter((x) => x.subjectCourse === parsedCode).map(
                (x) => x.term
            )
        ).join(", ");

        const embed = new EmbedBuilder()
            .setTitle(
                `${searchRes.subjCourse}: **${searchRes.courseName}** (${searchRes.units} Units)`
            )
            .setColor("Green")
            .setDescription(">>> " + searchRes.description)
            .setFooter({ text: `Listings Last Scraped: ${DataRegistry.CONFIG.ucsdInfo.miscData.courseList.lastUpdated}` });

        if (historicalOfferings.length > 0) {
            embed.addFields({ name: "Past Terms Offered", value: StringUtil.codifyString(historicalOfferings) });
        }

        for (const field of pastProfessors) {
            embed.addFields({ name: "Past Professors (WI18+)", value: StringUtil.codifyString(field) });
        }

        await ctx.interaction.editReply({
            embeds: [embed],
        });

        return 0;
    }
}
