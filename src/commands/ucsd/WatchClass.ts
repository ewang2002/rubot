import BaseCommand, { ArgumentType, ICommandContext, } from "../BaseCommand";

import { GeneralUtilities, ScraperApiWrapper } from "../../utilities";
import { DataRegistry } from "../../DataRegistry";
import { parseCourseSubjCode } from "../enroll-data/helpers/Helper";
import { PostgresWatch } from "../../utilities/PostgresWatch";

export default class WatchClass extends BaseCommand {
    public constructor() {
        super ({
            cmdCode: "WATCHCLASS",
            formalCommandName: "Watch Class",
            botCommandName: "watchclass",
            description: `Input the class you'd like to watch to get notified if there are empty seats.
            Will alert every time after the seats fill up and then a spot opens`,
            generalPermissions: [],
            botPermissions: [],
            argumentInfo: [
                {
                    displayName: "Course",
                    argName: "course",
                    type: ArgumentType.String,
                    desc: "Name of course you'd like to watch",
                    required: true,
                    example: ["COGS 108"],
                },
            ],
            commandCooldown: 4 * 1000,
            guildOnly: false,
            botOwnerOnly: false,
        });
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const course = ctx.interaction.options.getString("course", true);
        
        const parsedCode = parseCourseSubjCode(course);
        if (parsedCode.indexOf(" ") === -1) {
            await ctx.interaction.reply({
                content: `Your input, \`${course}\`, is not correctly formatted. It should look like \`SUBJ XXX\`.`,
                ephemeral: true,
            });

            return -1;
        }

        await ctx.interaction.deferReply();

        const [subject, num] = parsedCode.split(" ");

        // make a call to webreg api to see if course exists 
        const courseInfoList = await ScraperApiWrapper.getInstance().getCourseInfo(
            DataRegistry.CONFIG.ucsdInfo.currentWebRegTerms[0].term, subject, num);

        if (!courseInfoList || ("error" in courseInfoList) || courseInfoList.length === 0) {
            GeneralUtilities.log("Course Info doesn't exist or error'd", "Scraper API Request", "ERROR");

            await ctx.interaction.editReply({
                content: `The course, \`${parsedCode}\`, was not found. Try again.`,
            });

            return -1;
        }

        // if you're already watching the class
        const searchResults = await PostgresWatch.searchCourse(ctx.user.id, parsedCode);
        if (searchResults.length !== 0) {
            await ctx.interaction.editReply({
                content: `You are already watching \`${parsedCode}\`.`,
            });

            return -1;
        }

        // if course is correctly formatted, store the class in Postgres and return confirmation embed
        PostgresWatch.insertClass(ctx.user.id, parsedCode, ctx.channel.id);
        
        await ctx.interaction.editReply({
            embeds: [GeneralUtilities.generateBlankEmbed(ctx.user)
                .setTitle("Course added to watch list")
                .setFooter({
                    text: `Server Context: ${ctx.guild?.name ?? "Direct Message @edbird"}`,
                })
                .setDescription(`Watching course: \`${parsedCode}\``)],
        });

        return 0; 
    }
}