import { StringBuilder, TimeUtilities } from "../utilities";

export async function onErrorEvent(error: Error): Promise<void> {
    console.error(
        new StringBuilder()
            .append(`[${TimeUtilities.getDateTime()}] ${error.name}`)
            .appendLine(2)
            .append(`\t${error.message}`)
            .appendLine(2)
            .append(`\t${error.stack}`)
            .appendLine()
            .append("=====================================")
            .toString()
    );
}
