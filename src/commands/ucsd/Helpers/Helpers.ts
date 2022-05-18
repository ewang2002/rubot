import {IInternalCourseData, ViewAllClassrooms} from "../ViewAllClassrooms";
import {TimeUtilities} from "../../../utilities/TimeUtilities";
import {MessageSelectMenu, MessageSelectOptionData} from "discord.js";
import {ArrayUtilities} from "../../../utilities/ArrayUtilities";
import getWebRegDateStr = TimeUtilities.getWebRegDateStr;
import {EmojiConstants} from "../../../constants/GeneralConstants";


type ClassroomSection = {
    // Key
    // - classroom (e.g. CENTR 119)
    //
    // Current:
    //  - If we're looking at ACTIVE sections, then current will be the currently active session, or null
    //    if no such section exists.
    //  - If we're looking at INACTIVE sections, then current will be some classroom with an inactive session,
    //    or null if it is currently in use.
    //
    // upcomingSession represents the next session.
    [k: string]: {
        current: IInternalCourseData[];
        upcomingSession: IInternalCourseData[];
    };
}

/**
 * Gets the start or end time given the current time and the course to check.
 * @param {Date} cDateTime The current date and time. Needed for the current date.
 * @param {IInternalCourseData} c The course data.
 * @param {boolean} useStart Whether to use the start time.
 * @returns {Date} The date.
 */
export const getTimeFromObj = (cDateTime: Date, c: IInternalCourseData, useStart: boolean): Date => {
    const endDateTime = new Date(cDateTime);
    endDateTime.setHours(useStart ? c.startHr : c.endHr);
    endDateTime.setMinutes(useStart ? c.startMin : c.endMin);
    endDateTime.setSeconds(0);
    return endDateTime;
};

/**
 * Gets the select menus, where each selection is a building.
 * @param {string[]} buildings The buildings.
 * @param {string} uniqueId The unique ID.
 * @returns {MessageSelectMenu[]} The message select menu array, or `null` if something went wrong.
 */
export const getSelectMenusFromBuildings = (buildings: string[], uniqueId: string): MessageSelectMenu[] | null => {
    const selectMenus =  ArrayUtilities.breakArrayIntoSubsets(
        buildings.map(x => {
            const b = ViewAllClassrooms.BUILDING_CODES[x];
            return {code: x, name: b ? b : x};
        }),
        25
    ).map((x, i) => {
        const menu = new MessageSelectMenu();
        const options: MessageSelectOptionData[] = [];
        for (const {code, name} of x) {
            options.push({
                label: code,
                value: code,
                description: name
            });
        }

        return menu.addOptions(options)
            .setPlaceholder(`${x[0].code} - ${x.at(-1)!.code}`)
            .setCustomId(`${uniqueId}_select_${i}`);
    });

    // Add the cancel option somehow
    // If the last dropdown is at the max possible amount
    if (selectMenus.at(-1)!.options.length === 25) {
        // If there are too many buildings
        if (selectMenus.length === 5) {
            return null;
        }
        // Otherwise, just push a new select menu
        else {
            selectMenus.push(
                new MessageSelectMenu()
                    .addOptions([
                        {
                            emoji: EmojiConstants.X_EMOJI,
                            label: "End Process",
                            value: "END_PROCESS",
                            description: "Ends this menu."
                        }
                    ])
                    .setPlaceholder("Close Process")
                    .setCustomId(`${uniqueId}_select_123`)
            );
        }
    }
    else {
        selectMenus.at(-1)!.addOptions([
            {
                emoji: EmojiConstants.X_EMOJI,
                label: "End Process",
                value: "END_PROCESS",
                description: "Ends this menu."
            }
        ]);

        // Set the cancel option as the very first option
        selectMenus.at(-1)!.options.unshift(selectMenus.at(-1)!.options.pop()!);
        selectMenus.at(-1)!.placeholder += " & End Process"
    }

    return selectMenus;
}

/**
 * Gets the status of each classroom.
 * @param {Date} cDateTime The date to check.
 * @param {number} nextTime The buffer time (e.g. the amount of time to check *beyond* the current date). This
 * is used to track upcoming classes, in milliseconds.
 * @returns {ClassroomSection} All classrooms and their status.
 */
export function getUsedClassrooms(cDateTime: Date, nextTime: number): ClassroomSection {
    const [allCourses, classrooms] = ViewAllClassrooms.getCoursesClassrooms();
    const currTimeNum = cDateTime.getHours() * 100 + cDateTime.getMinutes();
    const currDayOfWk = ViewAllClassrooms.DAY_OF_WEEK[cDateTime.getDay()];
    const currDateStr = getWebRegDateStr(cDateTime);

    // Assume that, if the day is a finals day, then there must be at least ONE course
    // with that final date which has a length of 179 minutes
    const isFinalTime = allCourses.some(x => x.day[0] === currDateStr
        && new Date(
            2022, 0, 1, x.endHr, x.endMin
        ).getTime() - new Date(
            2022, 0, 1, x.startHr, x.startMin
        ).getTime() === ViewAllClassrooms.FINAL_DURATION_TO_MS);

    const coll: ClassroomSection = {};
    for (const classroom of classrooms) {
        // Filter the courses so that only the courses which is in progress or hasn't started yet is
        // left. Additionally, we only want classes that are on the current day.
        let sharedClasses = allCourses
            .filter(x => x.location === classroom
                && (x.startTime >= currTimeNum || x.endTime >= currTimeNum)
                && (isFinalTime
                    ? x.day[0] === currDateStr
                    : x.day.includes(currDayOfWk) || x.day[0] === currDateStr));
        // Sort the classes by start time.
        sharedClasses.sort((a, b) => a.startTime - b.startTime);
        coll[classroom] = {
            current: [],
            upcomingSession: []
        };

        if (sharedClasses.length === 0) {
            continue;
        }

        // Now we want to find all active classes
        // If the current time is between the first class's start, end time, then there is an
        // active session

        let i = 0;
        const seenCourses = new Set<string>();
        for (; i < sharedClasses.length; i++) {
            const classToCheck = sharedClasses[i];
            const identifier = `${classToCheck.subjCourseId}-${classToCheck.meetingType}`
                + `-${classToCheck.startTime}-${classToCheck.endTime}-${classToCheck.sectionFamily}`;
            if (seenCourses.has(identifier)) {
                continue;
            }

            if (classToCheck.startTime <= currTimeNum && currTimeNum <= classToCheck.endTime) {
                coll[classroom].current.push(classToCheck);
                seenCourses.add(identifier);
                continue;
            }

            break;
        }

        seenCourses.clear();
        for (; i < sharedClasses.length; i++) {
            const classToCheck = sharedClasses[i];
            const identifier = `${classToCheck.subjCourseId}-${classToCheck.meetingType}`
                + `-${classToCheck.startTime}-${classToCheck.endTime}-${classToCheck.sectionFamily}`;
            if (seenCourses.has(identifier)) {
                continue;
            }

            if (getTimeFromObj(cDateTime, classToCheck, true).getTime() - cDateTime.getTime() <= nextTime) {
                coll[classroom].upcomingSession.push(classToCheck);
                seenCourses.add(identifier);
                continue;
            }

            break;
        }
    }

    return coll;
}