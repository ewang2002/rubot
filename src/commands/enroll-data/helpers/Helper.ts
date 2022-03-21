import {Collection, MessageEmbed} from "discord.js";
import {Constants} from "../../../Constants";
import {ICapeRow} from "../../../definitions";
import {ArrayUtilities} from "../../../utilities/ArrayUtilities";
import {StringBuilder} from "../../../utilities/StringBuilder";
import CAPE_DATA = Constants.CAPE_DATA;
import {StringUtil} from "../../../utilities/StringUtilities";

/**
 * Parses the course subject code from a given string.
 * @param {string} code The raw course subject code.
 * @returns {string} The parsed course subject code.
 */
export function parseCourseSubjCode(code: string): string {
    let s = "";
    let i = 0;
    for (; i < code.length; i++) {
        // Regex to see if it's a number
        if (/^\d+$/.test(code[i])) {
            break;
        }

        if (code[i] === " ") {
            continue;
        }

        s += code[i];
    }

    s += " ";

    for (; i < code.length; i++) {
        s += code[i];
    }

    return s.toUpperCase().trim();
}

/**
 * Gets the CAPE summary as an embed.
 * @param {object} args The arguments.
 * @returns {[MessageEmbed | null, number]} A tuple where the first element is the message embed, if any, and the
 * second element is the number of entries found.
 */
export function getCapeSummary(args: {
    instructor?: string | null;
    courseNumber?: string | null;
    showSummary: boolean
}): [MessageEmbed | null, number] {
    if (!args.instructor && !args.courseNumber) {
        return [null, -1];
    }

    let res: ICapeRow[] = CAPE_DATA;
    if (args.instructor) {
        res = res.filter(x => x.instructor.toLowerCase() === args.instructor!.toLowerCase());
    }

    if (args.courseNumber) {
        res = res.filter(x => x.subjectCourse.toLowerCase() === args.courseNumber!.toLowerCase());
    }

    if (res.length === CAPE_DATA.length || res.length === 0) {
        return [null, res.length === CAPE_DATA.length ? CAPE_DATA.length : 0];
    }

    const embed = new MessageEmbed()
        .setColor("RANDOM")
        .setFooter({text: "Data from CAPE."});

    const processEmbed = (target: string, type: "instructor" | "course" | "all"): void => {
        const map: Collection<string, ICapeRow[]> = new Collection<string, ICapeRow[]>();
        for (const row of res) {
            if (!map.has(target)) {
                map.set(target, []);
            }

            const arr = map.get(target)!;
            arr.push(row);
        }

        for (const [instructor, capeRows] of map) {
            const fields = ArrayUtilities.arrayToStringFields(capeRows, (_, elem) => {
                const expectedGrade = elem.averageGradeExp === -1
                    ? "N/A"
                    : elem.averageGradeExp;
                const actualGrade = elem.averageGradeRec === -1
                    ? "N/A"
                    : elem.averageGradeRec;

                const b = new StringBuilder()
                    .append(`[${elem.term}] `);

                if (type === "all") {
                    b.append(`${elem.evaluationsMade}/${elem.enrollmentCount} Evaluations`).appendLine();
                }
                else {
                    b.append(type === "instructor" ? elem.subjectCourse : elem.instructor)
                        .append(` (${elem.evaluationsMade}/${elem.enrollmentCount} Evaluations)`).appendLine();
                }

                b.append(`- Rcmnd. Instructor  : ${elem.recommendedInstructor}%`).appendLine()
                    .append(`- Rcmnd. Class       : ${elem.recommendedClass}%`).appendLine()
                    .append(`- Study Hours/Week   : ${elem.studyHourWeek}`).appendLine()
                    .append(`- Avg. Grade Expected: ${expectedGrade}`).appendLine()
                    .append(`- Avg. Grade Received: ${actualGrade}`)
                    .appendLine(2);

                return b.toString();
            });

            let i = 0;
            for (; i < fields.length && embed.fields.length <= 25; i++) {
                if (embed.length + fields[i].length >= 5900) {
                    embed.setFooter({text: "Data from CAPE. Some results have been omitted."});
                    return;
                }
                embed.addField(instructor, StringUtil.codifyString(fields[i]));
            }
        }
    };

    // If only instructor, show limited stats
    if (args.instructor && !args.courseNumber) {
        embed.setTitle(`Instructor Review: **${args.instructor}**`)
            .setDescription(`CAPE summary is based on ${res.length} entries.`);
        processEmbed(args.instructor, "instructor");
        return [embed, res.length];
    }

    // If only course number, show limited stats
    if (args.courseNumber && !args.instructor) {
        embed.setTitle(`Course Review: **${args.courseNumber}**`)
            .setDescription(`CAPE summary is based on ${res.length} entries.`);
        processEmbed(args.courseNumber, "course");
        return [embed, res.length];
    }

    // Otherwise, we can show more stats
    if (args.showSummary) {
        let recommendClass = 0;
        let recommendInstructor = 0;
        let studyHrsWk = 0;
        let evalsMade = 0;
        let totalEnroll = 0;

        let averageGradeExpected = [0, 0];
        let averageGradeReceived = [0, 0];
        for (const row of res) {
            recommendClass += row.recommendedClass * row.evaluationsMade;
            recommendInstructor += row.recommendedInstructor * row.evaluationsMade;
            studyHrsWk += row.studyHourWeek * row.evaluationsMade;
            evalsMade += row.evaluationsMade;
            totalEnroll += row.enrollmentCount;

            if (row.averageGradeExp !== -1) {
                averageGradeExpected[0] += row.averageGradeExp * row.evaluationsMade;
                averageGradeExpected[1] += row.evaluationsMade;
            }

            if (row.averageGradeRec !== -1) {
                averageGradeReceived[0] += row.averageGradeRec * row.evaluationsMade;
                averageGradeReceived[1] += row.evaluationsMade;
            }
        }

        recommendClass /= evalsMade;
        recommendInstructor /= evalsMade;
        studyHrsWk /= evalsMade;
        const avgGradeExp = averageGradeExpected[1] === 0
            ? 0
            : averageGradeExpected[0] / averageGradeExpected[1];
        const avgGradeRec = averageGradeReceived[1] === 0
            ? 0
            : averageGradeReceived[0] / averageGradeReceived[1];

        embed.setTitle(`CAPE Summary for: **${args.instructor}** (Course **${args.courseNumber}**)`)
            .setDescription(`A total of **\`${evalsMade}\`** evaluations have been made, out of **\`${totalEnroll}\`**`
                + ` students enrolled in across **\`${res.length}\`** sections.`)
            .addField(
                "Recommend Instructor",
                StringUtil.codifyString(`${Math.round(recommendInstructor * 100) / 100}%`),
                true
            )
            .addField(
                "Recommend Course",
                StringUtil.codifyString(`${Math.round(recommendClass * 100 / 100)}%`),
                true
            )
            .addField(
                "Study Hours/Week",
                StringUtil.codifyString(Math.round(studyHrsWk * 100) / 100)
            )
            .addField(
                "Average Grade Expected",
                StringUtil.codifyString(Math.round(avgGradeExp * 100) / 100),
                true
            )
            .addField(
                "Average Grade Received",
                StringUtil.codifyString(Math.round(avgGradeRec * 100) / 100),
                true
            );

        return [embed, res.length];
    }

    embed.setTitle(`CAPE Summary for: **${args.instructor}** (Course **${args.courseNumber}**)`)
        .setDescription(`CAPE summary is based on ${res.length} entries.`);
    processEmbed(args.instructor!, "all");
    return [embed, res.length];
}