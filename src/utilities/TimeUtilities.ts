import { RegexConstants } from "../Constants";

export enum TimestampType {
    /**
     * Formats the time so that it's displayed relative to the
     * current time. For example, `in 23 days`.
     */
    Relative = "R",

    /**
     * Formats the time so that the full timestamp is given.
     * For example, `Friday, November 4, 2022 8:43 PM`
     */
    FullDate = "F",

    /**
     * Formats the time so that the full timestamp is given
     * except for the day of the week. For example,
     * `November 4, 2022 8:43 PM`.
     */
    FullDateNoDay = "f",

    /**
     * Formats the time so that only the time is shown.
     * For example, `8:43:00 PM`.
     */
    TimeOnly = "T",

    /**
     * Formats the time so that only the time is shown,
     * excluding the seconds. For example, `8:43 PM`.
     */
    TimeOnlyMinute = "t",

    /**
     * Formats the time so that only the date is shown.
     * For example, `November 4, 2022`.
     */
    DateOnly = "D",

    /**
     * Formats the time so that only the date is shown.
     * Only the numerics will be displayed. For example,
     * `11/04/2022`.
     */
    ShortenedDateOnly = "d",
}


export namespace TimeUtilities {
    /**
     * Pads a digit between [0, 9] with a 0 in front.
     * @param {number} n The number.
     * @returns {string} The padded string.
     */
    export const padTimeDigit = (n: number): string => (n >= 10 ? "" + n : "0" + n);

    /**
     * Gets the date formatted as if it was on WebReg. Useful for comparing dates.
     * @param {Date} d The date.
     * @returns {string} The formatted date.
     */
    export const getWebRegDateStr = (d: Date): string =>
        d.getFullYear() + "-" + padTimeDigit(d.getMonth() + 1) + "-" + padTimeDigit(d.getDate());

    /**
     * Converts the hour and minute values to a time string.
     * @param {number} hr The hour.
     * @param {number} min The minute.
     * @returns {string} The time string.
     */
    export const getTimeStr = (hr: number, min: number): string => {
        const hrFixedNum = hr <= 12 ? hr : hr % 12;
        const hrFixed = padTimeDigit(hrFixedNum === 0 ? 12 : hrFixedNum);
        const minFixed = padTimeDigit(min);
        return `${hrFixed}:${minFixed} ${hr < 12 ? "AM" : "PM"}`;
    };

    /**
     * Gets all days from a raw day of week string. For example, if the input string is
     * ```
     * MTuWF
     * ```
     * then the output array would be
     * ```
     * ["M", "Tu", "W", "F"]
     * ```
     *
     * @param {string} s The string containing the raw day of week.
     * @returns {string[]} The parsed array.
     */
    export function getAllDays(s: string): string[] {
        const allDays = [];
        let day = "";
        for (let i = 0; i < s.length; i++) {
            if (s[i] === s[i].toUpperCase() && day) {
                allDays.push(day);
                day = s[i];
                continue;
            }

            day += s[i];
        }

        allDays.push(day);

        return allDays;
    }

    /**
     * Gets the current time in a nice string format.
     * @param {string} [timezone] The timezone, if applicable. Otherwise, GMT is used.
     * @param {boolean} [removeAmPm] Whether to remove the AM/PM ending.
     * @returns {string} The current formatted date & time.
     */
    export function getFormattedTime(
        timezone: string = "Atlantic/Reykjavik",
        removeAmPm: boolean = true
    ): string {
        if (!isValidTimeZone(timezone)) {
            return new Intl.DateTimeFormat([], {
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
            }).format(new Date());
        }
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        };

        const str = new Intl.DateTimeFormat([], options).format(new Date());
        return removeAmPm ? str.replace(" AM", "").replace(" PM", "") : str;
    }

    /**
     * Gets the current time in a nice string format.
     * @param {Date | number} [date = new Date()] The date to choose, if any.
     * @param {string} [timezone] The timezone, if applicable. Otherwise, PT is used. See
     * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for a full list.
     * @returns {string} The current formatter date & time.
     */
    export function getDateTime(
        date: Date | number = new Date(),
        timezone: string = "America/Los_Angeles"
    ): string {
        if (!isValidTimeZone(timezone)) {
            return new Intl.DateTimeFormat([], {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
            }).format(date);
        }
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        };
        return new Intl.DateTimeFormat([], options).format(date);
    }

    /**
     * Gets the current time in a nice string format.
     * @param {Date | number} [date = new Date()] The date to choose, if any.
     * @param {string} [timezone] The timezone, if applicable. Otherwise, GMT is used. See
     * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for a full list.
     * @returns {string} The current formatter time.
     */
    export function getCurrentTime(
        date: Date | number = new Date(),
        timezone: string = "America/Los_Angeles"
    ): string {
        if (!isValidTimeZone(timezone)) {
            return new Intl.DateTimeFormat([], {
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
            }).format(date);
        }
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        };
        return new Intl.DateTimeFormat([], options).format(date);
    }

    /**
     * Determines whether the given timezone is valid or not.
     * @param {string} tz The timezone to test.
     * @returns {boolean} Whether the timezone is valid.
     * @see https://stackoverflow.com/questions/44115681/javascript-check-if-timezone-name-valid-or-not
     * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     */
    export function isValidTimeZone(tz: string): boolean {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
            return true;
        }
        catch (ex) {
            return false;
        }
    }

    /**
     * Converts the specified non-negative duration to a formatted string.
     * @param {number} dur The non-negative duration, in milliseconds.
     * @param {boolean} includeSeconds Whether to include the seconds portion in the formatted string.
     * @param {boolean} [includeMs] Whether to include the milliseconds portion in the formatted string.
     * @returns {string} The string representation of the duration.
     */
    export function formatDuration(
        dur: number,
        includeSeconds: boolean,
        includeMs: boolean = true
    ): string {
        dur = Math.max(0, dur);

        const days = Math.floor(dur / 8.64e7);
        dur %= 8.64e7;
        const hours = Math.floor(dur / 3.6e6);
        dur %= 3.6e6;
        const minutes = Math.floor(dur / 60_000);
        dur %= 60_000;
        const seconds = Math.floor(dur / 1000);
        dur %= 1000;

        const finalArr: string[] = [];
        if (days > 0) {
            finalArr.push(`${days}D`);
        }
        if (hours > 0) {
            finalArr.push(`${hours}H`);
        }
        if (minutes > 0) {
            finalArr.push(`${minutes}M`);
        }
        if (seconds > 0 && includeSeconds) {
            finalArr.push(`${seconds}S`);
        }
        if (dur > 0 && includeMs) {
            finalArr.push(`${dur}MS`);
        }
        return finalArr.length > 0 ? finalArr.join(" ") : "0S";
    }

    /**
     * Given a day of the week (where 0 = Sunday, 1 = Monday, ..., 6 = Saturday) and military time, gets the next
     * available date.
     * @param {Date | number} relativeTo The date to compare to.
     * @param {number} dayOfWeek The day of the week. 0 = Sunday, 1 = Monday, ..., 6 = Saturday. This must be
     * between 0 and 6, inclusive.
     * @param {number} militaryTime The military time. This should be represented by HHMM. Keep in mind that, for
     * hours, 0 <= HH <= 23. For minute, 0 <= MM <= 59.
     * @returns {Date} The new date.
     * @throws {Error} If the day of the week or military time is invalid.
     */
    export function getNextDate(
        relativeTo: Date | number,
        dayOfWeek: number,
        militaryTime: number
    ): Date {
        if (dayOfWeek > 6 || dayOfWeek < 0) {
            throw new Error("invalid day of week");
        }
        if (militaryTime > 2359 || militaryTime < 0) {
            throw new Error("invalid time");
        }
        const hr = Math.floor(militaryTime / 100);
        const min = militaryTime % 100;

        const relativeDate = new Date(relativeTo);
        const diffDays = (dayOfWeek + 7 - relativeDate.getDay()) % 7;
        const finalDate = new Date(relativeDate.getTime() + diffDays * 8.64e7);
        finalDate.setHours(hr);
        finalDate.setMinutes(min);
        finalDate.setSeconds(0);
        if (relativeDate.getDay() === dayOfWeek && finalDate.getTime() < relativeDate.getTime()) {
            finalDate.setDate(finalDate.getDate() + 7);
        }

        return finalDate;
    }

    /**
     * Creates a Discord timestamp
     * @param [options={}] Options to create the timestamp
     * @returns {string} The Discord timestamp
     */
    export function getDiscordTime({ time = Date.now(), style = TimestampType.Relative } = {}): string {
        // Truncate and divide by 1000 to transform  ms to seconds
        return `<t:${Math.trunc(time / 1000)}:${style}>`;
    }

    
    type TimeUnitType = { ms: number; formatted: string; };

    /**
     * Parses a time + unit string (for example, `3m`) into the corresponding duration in milliseconds.
     * @param {string} timeUnit The time and unit. There can be multiple.
     * @returns {TimeUtilities | null} The parsed time, if any.
     */
    export function parseTimeUnit(timeUnit: string): TimeUnitType | null {
        // Break up the time + units into individual strings
        // For example, 3d5m = [3d, 5m]
        let validStr = false;
        let lastIdx = 0;
        let duration = 0;
        for (let i = 0; i < timeUnit.length; i++) {
            // Not a letter or space = skip
            if (timeUnit[i] === " " || !RegexConstants.ONLY_LETTERS.test(timeUnit[i])) {
                continue;
            }
    
            //     --- substring(lastIdx, i)
            //     | |
            // ... 230m ...
            //     ^  ^
            //     |  i
            //     |
            //     lastIdx
            const parsedNum = Number.parseInt(timeUnit.substring(lastIdx, i).replaceAll(" ", ""), 10);
            lastIdx = i + 1;
            if (Number.isNaN(parsedNum)) {
                continue;
            }
    
            switch (timeUnit[i]) {
                case "m": {
                    duration += parsedNum * 60000;
                    break;
                }
                case "h": {
                    duration += parsedNum * 3.6e+6;
                    break;
                }
                case "d": {
                    duration += parsedNum * 8.64e+7;
                    break;
                }
                case "w": {
                    duration += parsedNum * 6.048e+8;
                    break;
                }
                default: {
                    duration += parsedNum * 8.64e+7;
                    break;
                }
            }
    
            validStr = true;
        }
        return validStr ? { ms: duration, formatted: formatDuration(duration, true, false) } : null;
    }
}
