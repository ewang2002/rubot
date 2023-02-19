import { ArgumentType, BaseCommand, ICommandContext, ICommandInfo } from "../BaseCommand";
import { ActivitiesOptions, ActivityType, PresenceData } from "discord.js";
import { GeneralConstants } from "../../Constants";

export class SetActivity extends BaseCommand {
    public constructor() {
        const cmi: ICommandInfo = {
            cmdCode: "SET_ACTIVITY",
            formalCommandName: "Set Activity Command",
            botCommandName: "setactivity",
            description: "Sets the bot's activity.",
            commandCooldown: 30 * 1000,
            generalPermissions: [],
            argumentInfo: [
                {
                    displayName: "Activity Type",
                    argName: "activity_type",
                    desc: "The bot's activity type (Playing, Watching, Listening).",
                    type: ArgumentType.String,
                    restrictions: {
                        stringChoices: [
                            { name: "Playing", value: "PLAYING" },
                            { name: "Listening (to)", value: "LISTENING" },
                            { name: "Watching", value: "WATCHING" },
                        ],
                    },
                    required: true,
                    example: ["Watching"],
                },
                {
                    displayName: "Activity",
                    argName: "activity",
                    desc: "The bot's activity (game).",
                    type: ArgumentType.String,
                    required: true,
                    example: ["All of the clowns"],
                },
            ],
            botPermissions: [],
            guildOnly: false,
            botOwnerOnly: false,
            allowOnServers: GeneralConstants.PERMITTED_SERVER_IDS,
        };

        super(cmi);
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const activity = ctx.interaction.options.getString("activity", true);
        const activityType = ctx.interaction.options.getString("activity_type", true);

        const presenceData: PresenceData = {};
        // We have to do this because a string is not an ActivityTypes
        const fullActivity: ActivitiesOptions = {};
        switch (activityType) {
            case "PLAYING": {
                fullActivity.type = ActivityType.Playing;
                break;
            }
            case "LISTENING": {
                fullActivity.type = ActivityType.Listening;
                break;
            }
            case "WATCHING": {
                fullActivity.type = ActivityType.Watching;
                break;
            }
            default: {
                fullActivity.type = ActivityType.Playing;
                break;
            }
        }

        fullActivity.name = activity;
        presenceData.activities = [fullActivity];

        await ctx.user.client.user!.setPresence(presenceData);
        await ctx.interaction.reply({
            ephemeral: true,
            content: "Done!",
        });
        return 0;
    }
}
