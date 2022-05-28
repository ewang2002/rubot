export namespace GeneralConstants {
    export const ZERO_WIDTH_SPACE: string = "\u200b";
    export const PERMITTED_SERVER_IDS: string[] = ["778738941443440640", "533476850421202944"];

    // Looking for any of: i'm, im, i am (case insensitive) that:
    // - is at the start of the string or starts with at least one space
    // - ends with at least one space
    export const IM_REGEX: RegExp = /(^|\s+)(i'm|im|i\s+am)\s+/ig;
}

export namespace EmojiConstants {
    export const LOCK_EMOJI: string = "🔒";
    export const MINUS_EMOJI: string = "➖";
    export const PLUS_EMOJI: string = "➕";
    export const LONG_SIDEWAYS_ARROW_EMOJI: string = "↔️";
    export const X_EMOJI: string = "❌";
    export const RED_SQUARE_EMOJI: string = "🟥";
    export const GREEN_SQUARE_EMOJI: string = "🟩";
    export const WHITE_SQUARE_EMOJI: string = "⬜";
    export const BLACK_SQUARE_EMOJI: string = "⬛";
    export const YELLOW_SQUARE_EMOJI: string = "🟨";
    export const GREEN_CHECK_EMOJI: string = "✅";
    export const HOURGLASS_EMOJI: string = "⌛";
    export const RIGHT_TRIANGLE_EMOJI: string = "▶️";
    export const UP_TRIANGLE_EMOJI: string = "🔼";
    export const DOWN_TRIANGLE_EMOJI: string = "🔽";
    export const LONG_LEFT_ARROW_EMOJI: string = "⬅";
    export const LONG_RIGHT_TRIANGLE_EMOJI: string = "➡";
    export const STOP_SIGN_EMOJI: string = "🛑";
    export const WARNING_EMOJI: string = "⚠️";
    export const QUESTION_MARK_EMOJI: string = "❓";

    export const LONG_UP_ARROW_EMOJI: string = "⬆️";
    export const LONG_DOWN_ARROW_EMOJI: string = "⬇️";
    export const ARROW_HEADING_UP_EMOJI: string = "⤴️";
    export const ARROW_HEADING_DOWN_EMOJI: string = "⤵️";
    export const INBOX_EMOJI: string = "📥";
    export const OUTBOX_EMOJI: string = "📤";
}