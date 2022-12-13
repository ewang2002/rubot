import {ArgumentType, BaseCommand, ICommandContext, ICommandInfo} from "../BaseCommand";
import {GeneralConstants} from "../../constants/GeneralConstants";
import { GeneralUtilities } from "../../utilities/GeneralUtilities";

export class Role extends BaseCommand {
    public constructor() {
        const cmi: ICommandInfo = {
            cmdCode: "ROLE",
            formalCommandName: "Role",
            botCommandName: "role",
            description: "Gives or takes away a role.",
            commandCooldown: 2 * 1000,
            generalPermissions: [],
            argumentInfo: [
                {
                    displayName: "Role",
                    argName: "role",
                    desc: "The role to give yourself. Must be lower than your highest role.",
                    type: ArgumentType.Role,
                    prettyType: "Role",
                    required: true,
                    example: ["minecraft"]
                }
            ],
            botPermissions: ["MANAGE_ROLES"],
            guildOnly: true,
            botOwnerOnly: false,
            allowOnServers: GeneralConstants.PERMITTED_SERVER_IDS
        };

        super(cmi);
    }

    /**
     * @inheritDoc
     */
    public async run(ctx: ICommandContext): Promise<number> {
        const role = ctx.interaction.options.getRole("role", true);
        const userHighestRole = ctx.member!.roles.highest;

        if (role.managed || role.position >= userHighestRole.position) {
            await ctx.interaction.reply({
                content: `You cannot give the role, ${role}, to yourself.`,
                allowedMentions: {
                    roles: []
                }
            });

            return -1;
        }

        if (ctx.member!.roles.cache.has(role.id)) {
            const roleRemoveStatus = await GeneralUtilities.tryExecuteAsync<boolean>(async () => {
                await ctx.member!.roles.remove(role.id, "Via role command.");
                return true;
            }) ?? false;
    
            await ctx.interaction.reply({
                content: roleRemoveStatus
                    ? `Successfully removed ${role} from you.`
                    : `Unable to remove ${role} from you.`,
                allowedMentions: {
                    roles: []
                }
            });

            return 0;
        }

        const roleGiveStatus = await GeneralUtilities.tryExecuteAsync<boolean>(async () => {
            await ctx.member!.roles.add(role.id, "Via role command.");
            return true;
        }) ?? false;

        await ctx.interaction.reply({
            content: roleGiveStatus
                ? `Successfully assigned ${role} to you.`
                : `Unable to assign ${role} to you.`,
            allowedMentions: {
                roles: []
            }
        });

        return 0;
    }
}