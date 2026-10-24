import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlayerStatus, ROSTER_ROLES } from "../../../player/domain/roster";
import {
  ROSTER_PROPOSAL_STATUSES,
  type RosterChange,
} from "../../../roster-proposal/domain/roster-proposal";
import type { McpToolContext } from "../mcp-tool-context";
import { runStaffReadTool, runWriteTool } from "../permission-gate";
import { adminRosterProposalsUrl } from "../urls";
import { requireUpdateFields } from "./update-fields";

const sourceUrlSchema = z
  .string()
  .url()
  .regex(/^https?:\/\//, "Use an http(s) URL")
  .describe(
    "Required public source: the official team or player announcement, the PandaScore page, or the start.gg event. A start.gg source marks created players and teams as start.gg data; they stay public and readable through the MCP.",
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

const REVIEW_NOTE =
  "Nothing changed yet. A staff member must approve this proposal in the admin app before it applies.";

export function registerRosterTools(server: McpServer, ctx: McpToolContext): void {
  const { user } = ctx;

  const propose = async (change: RosterChange, sourceUrl: string) => {
    const proposal = await ctx.rosterProposalService.propose(change, sourceUrl, user.id);
    return {
      entityId: proposal.id,
      sourceUrl,
      result: {
        proposalId: proposal.id,
        kind: change.kind,
        status: proposal.status,
        reviewUrl: adminRosterProposalsUrl(),
        note: REVIEW_NOTE,
      },
    };
  };

  server.registerTool(
    "add_player_to_team",
    {
      description:
        "Propose adding a player to a team's current roster. Requires players.manage. Once approved, closes the player's open contracts at effectiveDate and opens a new one, so roster history is kept. Check get_player and get_team first.",
      inputSchema: {
        playerId: z.string().uuid().describe("Player UUID."),
        teamId: z.string().uuid().describe("Team UUID."),
        effectiveDate: effectiveDateSchema,
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ sourceUrl, ...input }) =>
      runWriteTool(user, "add_player_to_team", "players.manage", () =>
        propose({ kind: "add_player_to_team", ...input }, sourceUrl),
      ),
  );

  server.registerTool(
    "remove_player_from_team",
    {
      description:
        "Propose removing a player from a team's current roster. Requires players.manage. Once approved, closes the open contract at effectiveDate instead of deleting it and sets the player's status.",
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
    async ({ sourceUrl, status, ...input }) =>
      runWriteTool(user, "remove_player_from_team", "players.manage", () =>
        propose(
          { kind: "remove_player_from_team", ...input, status: status ?? PlayerStatus.FREE_AGENT },
          sourceUrl,
        ),
      ),
  );

  server.registerTool(
    "create_player",
    {
      description:
        "Propose creating a player without a team. Requires players.manage. Run search_players and list_roster_proposals first to avoid duplicates, then propose add_player_to_team once the player exists.",
      inputSchema: {
        name: z.string().min(1).max(255).describe("In-game name."),
        country: countrySchema.optional(),
        status: playerStatusSchema.optional(),
        role: rosterRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ name, country, status, role, sourceUrl }) =>
      runWriteTool(user, "create_player", "players.manage", () =>
        propose(
          {
            kind: "create_player",
            name,
            nationality: country,
            status: status ?? PlayerStatus.FREE_AGENT,
            role,
          },
          sourceUrl,
        ),
      ),
  );

  server.registerTool(
    "update_player",
    {
      description:
        "Propose updating a player's name, country, status, or role. Requires players.manage. Use add_player_to_team and remove_player_from_team to change teams.",
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
      runWriteTool(user, "update_player", "players.manage", () => {
        requireUpdateFields({ name, country, status, role });
        return propose(
          { kind: "update_player", playerId, name, nationality: country, status, role },
          sourceUrl,
        );
      }),
  );

  server.registerTool(
    "create_team",
    {
      description:
        "Propose creating a team. Requires teams.manage. Run search_teams and list_roster_proposals first to avoid duplicates.",
      inputSchema: {
        name: z.string().min(1).max(255).describe("Team name."),
        country: countrySchema.optional(),
        imageUrl: z.string().url().max(255).optional().describe("Logo URL."),
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ name, country, imageUrl, sourceUrl }) =>
      runWriteTool(user, "create_team", "teams.manage", () =>
        propose({ kind: "create_team", name, location: country, imageUrl }, sourceUrl),
      ),
  );

  server.registerTool(
    "update_team",
    {
      description:
        "Propose updating a team's name, country, or logo, or marking it inactive. Requires teams.manage. Teams are never deleted; remove current players before setting active to false.",
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
      runWriteTool(user, "update_team", "teams.manage", () => {
        requireUpdateFields({ name, country, imageUrl, active });
        return propose(
          { kind: "update_team", teamId, name, location: country, imageUrl, active },
          sourceUrl,
        );
      }),
  );

  server.registerTool(
    "merge_players",
    {
      description:
        "Propose merging a duplicate player into the player to keep. Requires players.manage. Once approved, contracts, photos, awards and tournament rosters move to the kept player, and the duplicate stays as a redirect to it instead of being deleted. Fails when both are distinct PandaScore players or play for different current teams.",
      inputSchema: {
        keptPlayerId: z.string().uuid().describe("UUID of the player to keep."),
        duplicatePlayerId: z.string().uuid().describe("UUID of the duplicate to merge into it."),
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ keptPlayerId, duplicatePlayerId, sourceUrl }) =>
      runWriteTool(user, "merge_players", "players.manage", () =>
        propose(
          { kind: "merge_players", keptId: keptPlayerId, duplicateId: duplicatePlayerId },
          sourceUrl,
        ),
      ),
  );

  server.registerTool(
    "merge_teams",
    {
      description:
        "Propose merging a duplicate team into the team to keep. Requires teams.manage. Once approved, contracts, current players and tournament participations move to the kept team, and the duplicate becomes an inactive redirect to it instead of being deleted. Fails when both teams played in the same tournament or are distinct PandaScore teams.",
      inputSchema: {
        keptTeamId: z.string().uuid().describe("UUID of the team to keep."),
        duplicateTeamId: z.string().uuid().describe("UUID of the duplicate to merge into it."),
        sourceUrl: sourceUrlSchema,
      },
    },
    async ({ keptTeamId, duplicateTeamId, sourceUrl }) =>
      runWriteTool(user, "merge_teams", "teams.manage", () =>
        propose(
          { kind: "merge_teams", keptId: keptTeamId, duplicateId: duplicateTeamId },
          sourceUrl,
        ),
      ),
  );

  server.registerTool(
    "list_roster_proposals",
    {
      description:
        "List roster proposals, pending by default. Requires players.manage. Check pending proposals before proposing a change so the same player, team or move is not proposed twice. Applied proposals carry the created or updated entityId.",
      inputSchema: {
        status: z
          .enum(ROSTER_PROPOSAL_STATUSES)
          .optional()
          .describe("Proposal status (default pending)."),
      },
    },
    async ({ status }) =>
      runStaffReadTool(user, "players.manage", async () => {
        const { proposals, names } = await ctx.rosterProposalService.list(status ?? "pending");
        return {
          proposals: proposals.map((proposal) => ({
            id: proposal.id,
            change: proposal.change,
            sourceUrl: proposal.sourceUrl,
            status: proposal.status,
            entityId: proposal.entityId,
            createdAt: proposal.createdAt,
          })),
          names,
        };
      }),
  );
}
