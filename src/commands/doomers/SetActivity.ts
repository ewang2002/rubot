import {ArgumentType, BaseCommand, ICommandContext, ICommandInfo} from "../BaseCommand";
import {ActivitiesOptions, PresenceData} from "discord.js";
import {GeneralConstants} from "../../constants/GeneralConstants";

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
                            ["Playing", "PLAYING"],
                            ["Listening (to)", "LISTENING"],
                            ["Watching", "WATCHING"]
                        ]
                    },
                    prettyType: "String",
                    required: true,
                    example: ["Watching"]
                },
                {
                    displayName: "Activity",
                    argName: "activity",
                    desc: "The bot's activity (game).",
                    type: ArgumentType.String,
                    prettyType: "String",
                    required: true,
                    example: ["All of the clowns"]
                }
            ],
            botPermissions: [],
            guildOnly: false,
            botOwnerOnly: false,
            allowOnServers: GeneralConstants.PERMITTED_SERVER_IDS
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
                fullActivity.type = "PLAYING";
                break;
            }
            case "LISTENING": {
                fullActivity.type = "LISTENING";
                break;
            }
            case "WATCHING": {
                fullActivity.type = "WATCHING";
                break;
            }
            default: {
                fullActivity.type = "PLAYING";
                break;
            }
        }

        fullActivity.name = activity;
        presenceData.activities = [fullActivity];

        await ctx.user.client.user!.setPresence(presenceData);
        await ctx.interaction.reply({
            ephemeral: true,
            content: "Done!"
        });
        return 0;
    }
}