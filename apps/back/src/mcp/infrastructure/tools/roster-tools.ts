import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlayerStatus, ROSTER_ROLES, type Contract } from "../../../player/domain/roster";
import type { RosterMove } from "../../../player/application/player.service";
import { mapPlayerSummary, mapTeamSummary } from "../mappers";
import type { McpToolContext } from "../mcp-tool-context";
import { runWriteTool } from "../permission-gate";
import { requireUpdateFields } from "./update-fields";

const sourceUrlSchema = z
  .string()
  .url()
  .regex(/^https?:\/\//, "Use an http(s) URL")
  .describe(
    "Required public source: the official team or player announcement, the PandaScore page, or the start.gg event.",
  );

const effectiveDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .describe("Date the move takes effect according to the source (YYYY-MM-DD).");

const countrySchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Use an ISO 3166-1 alpha-2 code")
  .describe("ISO 3166-1 alpha-2 country code (e.g. FR).");

const playerStatusSchema = z
  .enum([PlayerStatus.ACTIVE, PlayerStatus.FREE_AGENT, PlayerStatus.RETIRED])
  .describe("Career status.");

const rosterRoleSchema = z
  .enum(ROSTER_ROLES)
  .describe("Roster role: player, coach, or substitute.");

function mapContract(contract: Contract) {
  return {
    id: contract.id,
    teamId: contract.team.id,
    teamName: contract.team.name,
    startDate: contract.startDate,
    endDate: contract.endDate,
    joinSourceUrl: contract.joinSourceUrl,
    leaveSourceUrl: contract.leaveSourceUrl,
  };
}

function mapRosterMove(move: RosterMove) {
  return {
    player: mapPlayerSummary(move.player),
    opened: move.opened ? mapContract(move.opened) : null,
    closed: move.closed.map(mapContract),
  };
}

export function registerRosterTools(server: McpServer, ctx: McpToolContext): void {
  const { user } = ctx;

  server.registerTool(
    "add_player_to_team",
    {
      description:
        "Add a player to a team's current roster. Requires players.manage. Closes the player's open contracts at effectiveDate and opens a new one, so roster history is kept. Check get_player and get_team first.",
      inputSchema: {
        playerId: z.string().uuid().describe("Player UUID."),
        teamId: z.string().uuid().describe("Team UUID."),
        effectiveDate: effectiveDateSchema,
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ playerId, ...input }) =>
      runWriteTool(user, "add_player_to_team", "players.manage", async () => ({
        entityId: playerId,
        sourceUrl: input.sourceUrl,
        result: mapRosterMove(await ctx.playerService.joinTeam(playerId, input)),
      })),
  );

  server.registerTool(
    "remove_player_from_team",
    {
      description:
        "Remove a player from a team's current roster. Requires players.manage. Closes the open contract at effectiveDate instead of deleting it and sets the player's status.",
      inputSchema: {
        playerId: z.string().uuid().describe("Player UUID."),
        teamId: z.string().uuid().describe("Team UUID the player leaves."),
        effectiveDate: effectiveDateSchema,
        sourceUrl: sourceUrlSchema,
        status: z
          .enum([PlayerStatus.FREE_AGENT, PlayerStatus.RETIRED])
          .optional()
          .describe("Status after leaving. Defaults to free_agent."),
      },
    },
    async ({ playerId, status, ...input }) =>
      runWriteTool(user, "remove_player_from_team", "players.manage", async () => ({
        entityId: playerId,
        sourceUrl: input.sourceUrl,
        result: mapRosterMove(
          await ctx.playerService.leaveTeam(playerId, {
            ...input,
            status: status ?? PlayerStatus.FREE_AGENT,
          }),
        ),
      })),
  );

  server.registerTool(
    "create_player",
    {
      description:
        "Create a player without a team. Requires players.manage. Run search_players first to avoid duplicates, then use add_player_to_team to place the player on a roster.",
      inputSchema: {
        name: z.string().min(1).max(255).describe("In-game name."),
        country: countrySchema.optional(),
        status: playerStatusSchema.optional(),
        role: rosterRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ name, country, status, role, sourceUrl }) =>
      runWriteTool(user, "create_player", "players.manage", async () => {
        const player = await ctx.playerService.create({
          name,
          nationality: country,
          status: status ?? PlayerStatus.FREE_AGENT,
          role,
        });
        return { entityId: player.id, sourceUrl, result: mapPlayerSummary(player) };
      }),
  );

  server.registerTool(
    "update_player",
    {
      description:
        "Update a player's name, country, status, or role. Requires players.manage. Use add_player_to_team and remove_player_from_team to change teams.",
      inputSchema: {
        playerId: z.string().uuid().describe("Player UUID."),
        name: z.string().min(1).max(255).optional().describe("In-game name."),
        country: countrySchema.optional(),
        status: playerStatusSchema.optional(),
        role: rosterRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ playerId, name, country, status, role, sourceUrl }) =>
      runWriteTool(user, "update_player", "players.manage", async () => {
        requireUpdateFields({ name, country, status, role });
        const player = await ctx.playerService.update(playerId, {
          name,
          nationality: country,
          status,
          role,
        });
        return { entityId: player.id, sourceUrl, result: mapPlayerSummary(player) };
      }),
  );

  server.registerTool(
    "create_team",
    {
      description:
        "Create a team. Requires teams.manage. Run search_teams first to avoid duplicates.",
      inputSchema: {
        name: z.string().min(1).max(255).describe("Team name."),
        country: countrySchema.optional(),
        imageUrl: z.string().url().max(255).optional().describe("Logo URL."),
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ name, country, imageUrl, sourceUrl }) =>
      runWriteTool(user, "create_team", "teams.manage", async () => {
        const team = await ctx.teamService.create({ name, location: country, imageUrl });
        return { entityId: team.id, sourceUrl, result: mapTeamSummary(team) };
      }),
  );

  server.registerTool(
    "update_team",
    {
      description:
        "Update a team's name, country, or logo, or mark it inactive. Requires teams.manage. Teams are never deleted; remove current players before setting active to false.",
      inputSchema: {
        teamId: z.string().uuid().describe("Team UUID."),
        name: z.string().min(1).max(255).optional().describe("Team name."),
        country: countrySchema.optional(),
        imageUrl: z.string().url().max(255).optional().describe("Logo URL."),
        active: z.boolean().optional().describe("False marks a disbanded team inactive."),
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ teamId, name, country, imageUrl, active, sourceUrl }) =>
      runWriteTool(user, "update_team", "teams.manage", async () => {
        requireUpdateFields({ name, country, imageUrl, active });
        const team = await ctx.teamService.update(teamId, {
          name,
          location: country,
          imageUrl,
          active,
        });
        return { entityId: team.id, sourceUrl, result: mapTeamSummary(team) };
      }),
  );
}
