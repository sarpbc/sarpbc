import { z } from "zod";
import {
  CONTRACT_ROLES,
  PLAYER_AWARD_TYPES,
  PLAYER_STATUSES,
  ROSTER_PROPOSAL_STATUSES,
  STREAM_KINDS,
  TEAM_LOGO_VARIANTS,
  type PlayerStatus,
  type RosterChange,
  type RosterProposalStatus,
} from "@sarpbc/types";
import {
  MAX_PRIZE_AMOUNT,
  MAX_PRIZE_ENTRIES,
  MAX_PRIZE_PLAYERS,
  MAX_STREAMS,
  ROSTER_PROPOSAL_PERMISSIONS,
  STREAM_CHANNEL_MAX_LENGTH,
  isIso4217Code,
} from "@sarpbc/utils";
import { isRedistributable, sourceFromUrl } from "../../../common/domain/data-source";
import { InvalidInputError } from "../../../common/domain/errors";
import {
  MAX_TEAM_LOGO_BYTES,
  MIN_TEAM_LOGO_PIXELS,
  isLiquipediaHost,
} from "../../../roster/domain/team-logo";
import type { RosterProposalService } from "../../../roster-proposal/application/roster-proposal.service";
import type { RosterProposal } from "../../../roster-proposal/domain/roster-proposal";
import { defineTool, type McpTool, type ToolWrite } from "../define-tool";
import { adminRosterProposalsUrl } from "../urls";
import { requireUpdateFields } from "./update-fields";

const DEFAULT_PLAYER_STATUS = "free_agent" satisfies PlayerStatus;
const DEFAULT_PROPOSAL_STATUS = "pending" satisfies RosterProposalStatus;

const withoutLiquipedia = (use: string) =>
  [
    (url: string) => !URL.canParse(url) || !isLiquipediaHost(new URL(url).hostname),
    `Liquipedia is not an accepted source; ${use}`,
  ] as const;

const sourceUrlSchema = z
  .string()
  .url()
  .regex(/^https?:\/\//, "Use an http(s) URL")
  .refine(...withoutLiquipedia("cite the official announcement it relies on"))
  .describe(
    "Required public source: the official team or player announcement, RLEsports, the PandaScore page, or the start.gg event. Never Liquipedia. A start.gg source marks created players and teams as start.gg data; they stay public and readable through the MCP.",
  );

const streamsSchema = z
  .array(
    z.object({
      url: z
        .string()
        .min(1)
        .max(2048)
        .describe(
          "https URL of the live channel (twitch.tv, youtube.com, kick.com or another site).",
        ),
      language: z
        .string()
        .min(2)
        .max(2)
        .describe("ISO 639-1 language of the broadcast (e.g. en, fr, de, es)."),
      kind: z
        .enum(STREAM_KINDS)
        .describe("official for the organiser's broadcast, costream for an authorised co-stream."),
      channel: z
        .string()
        .max(STREAM_CHANNEL_MAX_LENGTH)
        .optional()
        .describe(
          "Channel name. Optional for twitch.tv, kick.com and youtube.com/@handle URLs, where it defaults to the channel in the URL.",
        ),
    }),
  )
  .max(MAX_STREAMS)
  .describe(
    "The complete list of live streams; once approved it replaces the current list. An empty list clears it, so the inherited list shows again.",
  );

const STREAMS_NOTE =
  "An event list is inherited by its tournaments that have no list of their own, and a tournament list by its matches that have none; a list set lower down replaces the inherited one entirely. PandaScore entities are accepted. start.gg tournaments and matches are refused. A start.gg sourceUrl marks the streams as start.gg data: the site shows them with credit and they stay out of the MCP.";

const reasonSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .describe("Why the entity should be removed, for the staff reviewer.");

const contractDateSchema = z.iso.date("Use a real YYYY-MM-DD date");

const effectiveDateSchema = contractDateSchema.describe(
  "Date the move takes effect according to the source (YYYY-MM-DD).",
);

const contractRoleSchema = z
  .enum(CONTRACT_ROLES)
  .describe(
    "Contract role. Players: active, benched, or loaned. Staff: coach, assistant_coach, analyst, or manager. Defaults to active. When a player moves into a staff role, open a new contract with that role instead of changing their past player contracts.",
  );

const countrySchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Use an ISO 3166-1 alpha-2 code")
  .describe("ISO 3166-1 alpha-2 country code (e.g. FR).");

const playerStatusSchema = z.enum(PLAYER_STATUSES).describe("Career status.");

const REVIEW_NOTE =
  "Nothing changed yet. A staff member must approve this proposal in the admin app before it applies.";

const LOGO_LIMITS = `at most ${MAX_TEAM_LOGO_BYTES / (1024 * 1024)} MB, at least ${MIN_TEAM_LOGO_PIXELS}x${MIN_TEAM_LOGO_PIXELS} pixels`;

export interface RosterToolServices {
  rosterProposalService: Pick<RosterProposalService, "propose" | "proposeTeamLogo" | "list">;
}

function redistributableChange(change: RosterChange, sourceUrl: string): RosterChange {
  switch (change.kind) {
    case "set_event_streams":
    case "set_tournament_streams":
    case "set_match_streams":
      return isRedistributable(sourceFromUrl(sourceUrl)) ? change : { ...change, streams: [] };
    default:
      return change;
  }
}

function proposed(proposal: RosterProposal, sourceUrl: string | undefined): ToolWrite {
  return {
    entityId: proposal.id,
    sourceUrl,
    result: {
      proposalId: proposal.id,
      kind: proposal.change.kind,
      change: proposal.change,
      status: proposal.status,
      reviewUrl: adminRosterProposalsUrl(),
      note: REVIEW_NOTE,
    },
  };
}

export function rosterTools({ rosterProposalService }: RosterToolServices): McpTool[] {
  const propose = async (change: RosterChange, sourceUrl: string, userId: string) =>
    proposed(await rosterProposalService.propose(change, sourceUrl, userId), sourceUrl);

  return [
    defineTool({
      name: "add_player_to_team",
      description:
        "Propose adding a player or staff member to a team's current roster. Once approved, closes the player's open contracts at effectiveDate and opens a new one with the given role, so roster history is kept. Use the same team with a new role when a player changes role there, for example from active to benched or from player to coach; the same team and role is rejected. Check get_player and get_team first.",
      write: true,
      permission: "players.manage",
      input: {
        playerId: z.string().uuid().describe("Player UUID."),
        teamId: z.string().uuid().describe("Team UUID."),
        effectiveDate: effectiveDateSchema,
        role: contractRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ sourceUrl, role, ...input }, user) =>
        propose({ kind: "add_player_to_team", ...input, contractRole: role }, sourceUrl, user.id),
    }),

    defineTool({
      name: "remove_player_from_team",
      description:
        "Propose removing a player from a team's current roster. Once approved, closes the open contract at effectiveDate instead of deleting it and sets the player's status.",
      write: true,
      permission: "players.manage",
      input: {
        playerId: z.string().uuid().describe("Player UUID."),
        teamId: z.string().uuid().describe("Team UUID the player leaves."),
        effectiveDate: effectiveDateSchema,
        sourceUrl: sourceUrlSchema,
        status: z
          .enum(["free_agent", "retired"])
          .optional()
          .describe(`Status after leaving. Defaults to ${DEFAULT_PLAYER_STATUS}.`),
      },
      handler: ({ sourceUrl, status, ...input }, user) =>
        propose(
          {
            kind: "remove_player_from_team",
            ...input,
            status: status ?? DEFAULT_PLAYER_STATUS,
          },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "create_player",
      description: `Propose creating a player without a team. Run search_players and list_roster_proposals first to avoid duplicates, then propose add_player_to_team once the player exists. The status defaults to ${DEFAULT_PLAYER_STATUS}.`,
      write: true,
      permission: "players.manage",
      input: {
        name: z.string().min(1).max(255).describe("In-game name."),
        country: countrySchema.optional(),
        status: playerStatusSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ name, country, status, sourceUrl }, user) =>
        propose(
          {
            kind: "create_player",
            name,
            nationality: country,
            status: status ?? DEFAULT_PLAYER_STATUS,
          },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "update_player",
      description:
        "Propose updating a player's name, country, or status. Use add_player_to_team and remove_player_from_team to change teams or roles.",
      write: true,
      permission: "players.manage",
      input: {
        playerId: z.string().uuid().describe("Player UUID."),
        name: z.string().min(1).max(255).optional().describe("In-game name."),
        country: countrySchema.optional(),
        status: playerStatusSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ playerId, name, country, status, sourceUrl }, user) => {
        requireUpdateFields({ name, country, status });
        return propose(
          { kind: "update_player", playerId, name, nationality: country, status },
          sourceUrl,
          user.id,
        );
      },
    }),

    defineTool({
      name: "create_team",
      description:
        "Propose creating a team. Run search_teams and list_roster_proposals first to avoid duplicates.",
      write: true,
      permission: "teams.manage",
      input: {
        name: z.string().min(1).max(255).describe("Team name."),
        country: countrySchema.optional(),
        imageUrl: z.string().url().max(255).optional().describe("Logo URL."),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ name, country, imageUrl, sourceUrl }, user) =>
        propose({ kind: "create_team", name, location: country, imageUrl }, sourceUrl, user.id),
    }),

    defineTool({
      name: "update_team",
      description:
        "Propose updating a team's name, country, or logo URL, or marking it inactive. Prefer upload_team_logo for logos. Remove current players before setting active to false. Use propose_delete_team only for a team created by mistake.",
      write: true,
      permission: "teams.manage",
      input: {
        teamId: z.string().uuid().describe("Team UUID."),
        name: z.string().min(1).max(255).optional().describe("Team name."),
        country: countrySchema.optional(),
        imageUrl: z.string().url().max(255).optional().describe("Logo URL."),
        active: z.boolean().optional().describe("False marks a disbanded team inactive."),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ teamId, name, country, imageUrl, active, sourceUrl }, user) => {
        requireUpdateFields({ name, country, imageUrl, active });
        return propose(
          { kind: "update_team", teamId, name, location: country, imageUrl, active },
          sourceUrl,
          user.id,
        );
      },
    }),

    defineTool({
      name: "upload_team_logo",
      description: `Propose a team logo variant stored on sarpbc.org. Downloads imageUrl (https PNG, WebP or SVG, ${LOGO_LIMITS}), rejects unsafe SVGs, and stores a square transparent WebP. Use the light variant for light backgrounds and the dark variant for dark backgrounds. Once approved, it replaces that variant on the team; the review shows it on both backgrounds.`,
      write: true,
      permission: "teams.manage",
      input: {
        teamId: z.string().uuid().describe("Team UUID."),
        variant: z
          .enum(TEAM_LOGO_VARIANTS)
          .describe("light for display on light backgrounds, dark for dark backgrounds."),
        imageUrl: z
          .string()
          .url()
          .regex(/^https:\/\//, "Use an https URL")
          .refine(...withoutLiquipedia("use the team's official asset"))
          .describe(
            "Direct https URL of the official logo file (PNG, WebP or SVG). Never Liquipedia.",
          ),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ teamId, variant, imageUrl, sourceUrl }, user) =>
        proposed(
          await rosterProposalService.proposeTeamLogo(
            { teamId, variant, imageUrl },
            sourceUrl,
            user.id,
          ),
          sourceUrl,
        ),
    }),

    defineTool({
      name: "merge_players",
      description:
        "Propose merging a duplicate player into the player to keep. Once approved, contracts, photos, awards and tournament rosters move to the kept player, and the duplicate stays as a redirect to it instead of being deleted. Fails when both are distinct PandaScore players or play for different current teams.",
      write: true,
      permission: "players.manage",
      input: {
        keptPlayerId: z.string().uuid().describe("UUID of the player to keep."),
        duplicatePlayerId: z.string().uuid().describe("UUID of the duplicate to merge into it."),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ keptPlayerId, duplicatePlayerId, sourceUrl }, user) =>
        propose(
          { kind: "merge_players", keptId: keptPlayerId, duplicateId: duplicatePlayerId },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "merge_teams",
      description:
        "Propose merging a duplicate team into the team to keep. Once approved, contracts, current players and tournament participations move to the kept team, and the duplicate becomes an inactive redirect to it instead of being deleted. Fails when both teams played in the same tournament or are distinct PandaScore teams.",
      write: true,
      permission: "teams.manage",
      input: {
        keptTeamId: z.string().uuid().describe("UUID of the team to keep."),
        duplicateTeamId: z.string().uuid().describe("UUID of the duplicate to merge into it."),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ keptTeamId, duplicateTeamId, sourceUrl }, user) =>
        propose(
          { kind: "merge_teams", keptId: keptTeamId, duplicateId: duplicateTeamId },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "create_contract",
      description:
        "Propose recording a dated contract in a player's career, such as a past stint with a former team. Run list_contracts and list_roster_proposals first. Only record periods the source states. A contract without endDate must be with the player's current team; use add_player_to_team for a new move. Once approved, it fails if it overlaps another contract with the same team.",
      write: true,
      permission: "players.manage",
      input: {
        playerId: z.string().uuid().describe("Player UUID."),
        teamId: z.string().uuid().describe("Team UUID."),
        startDate: contractDateSchema.describe("Date the player joined (YYYY-MM-DD)."),
        endDate: contractDateSchema
          .optional()
          .describe("Date the player left (YYYY-MM-DD). Omit only for the current team."),
        role: contractRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ playerId, teamId, startDate, endDate, role, sourceUrl }, user) => {
        if (endDate && endDate < startDate) {
          throw new InvalidInputError("endDate must not precede startDate.");
        }
        return propose(
          { kind: "create_contract", playerId, teamId, startDate, endDate, contractRole: role },
          sourceUrl,
          user.id,
        );
      },
    }),

    defineTool({
      name: "update_contract",
      description:
        "Propose correcting a contract's team, dates, or role. Take contractId from list_contracts. Pass null as endDate to reopen the contract, only for the player's current team. Contracts are never deleted through the MCP.",
      write: true,
      permission: "players.manage",
      input: {
        playerId: z.string().uuid().describe("UUID of the player the contract belongs to."),
        contractId: z.string().uuid().describe("Contract UUID from list_contracts."),
        teamId: z.string().uuid().optional().describe("Corrected team UUID."),
        startDate: contractDateSchema.optional().describe("Corrected start date (YYYY-MM-DD)."),
        endDate: contractDateSchema
          .nullable()
          .optional()
          .describe("Corrected end date (YYYY-MM-DD), or null to reopen."),
        role: contractRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ playerId, contractId, teamId, startDate, endDate, role, sourceUrl }, user) => {
        requireUpdateFields({ teamId, startDate, endDate, role });
        return propose(
          {
            kind: "update_contract",
            contractId,
            playerId,
            teamId,
            startDate,
            endDate,
            contractRole: role,
          },
          sourceUrl,
          user.id,
        );
      },
    }),

    defineTool({
      name: "propose_tournament_prizes",
      description:
        "Propose the prize distribution of one tournament stage. Once approved, it replaces the whole distribution of that stage, so list every paid placement. Read get_tournament_prizes first. Every team must be a participant of the stage and every listed player must be on that team's stage roster. start.gg tournaments are refused. Enter each amount in the currency the source states; never convert it.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.string().uuid().describe("Tournament stage UUID."),
        prizes: z
          .array(
            z.object({
              placement: z
                .number()
                .int()
                .min(1)
                .describe("Final placement; tied teams share the same placement."),
              amount: z
                .number()
                .int()
                .min(1)
                .max(MAX_PRIZE_AMOUNT)
                .describe("Whole amount in the stated currency."),
              currency: z
                .string()
                .refine(isIso4217Code, "Use an ISO 4217 currency code")
                .describe("ISO 4217 currency code as stated by the source (e.g. USD, EUR)."),
              teamId: z.string().uuid().describe("Team UUID."),
              playerIds: z
                .array(z.string().uuid())
                .max(MAX_PRIZE_PLAYERS)
                .optional()
                .describe(
                  "Optional player UUIDs from the team's stage roster who share this prize.",
                ),
            }),
          )
          .max(MAX_PRIZE_ENTRIES)
          .describe("Every paid placement of the stage."),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ tournamentId, prizes, sourceUrl }, user) =>
        propose(
          {
            kind: "set_tournament_prizes",
            tournamentId,
            prizes: prizes.map(({ playerIds, ...prize }) => ({
              ...prize,
              playerIds: playerIds ?? [],
            })),
          },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "propose_player_award",
      description:
        "Propose a player award of one tournament stage. Only propose awards the organiser officially announced. Use mvp for the tournament or World Championship MVP and grand_finals_mvp for a separate Grand Finals MVP. Read get_tournament_awards first: a stage holds several awards but at most one of each type. The team must be a participant of the stage and the player must be on that team's stage roster. start.gg tournaments are refused.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.string().uuid().describe("Tournament stage UUID."),
        teamId: z.string().uuid().describe("UUID of the team the player represented."),
        playerId: z.string().uuid().describe("Player UUID."),
        awardType: z
          .enum(PLAYER_AWARD_TYPES)
          .describe(
            "Award type: mvp, grand_finals_mvp, offensive_mvp, defensive_mvp or breakthrough_player.",
          ),
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ tournamentId, teamId, playerId, awardType, sourceUrl }, user) =>
        propose(
          { kind: "award_player", tournamentId, teamId, playerId, awardType },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "set_event_streams",
      description: `Propose the live streams of a tournament event. Nothing changes until a staff member approves it in the admin app. Read get_event first. ${STREAMS_NOTE}`,
      write: true,
      permission: "tournaments.manage",
      input: {
        eventId: z.string().uuid().describe("Event UUID."),
        streams: streamsSchema,
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ eventId, streams, sourceUrl }, user) =>
        propose({ kind: "set_event_streams", eventId, streams }, sourceUrl, user.id),
    }),

    defineTool({
      name: "set_tournament_streams",
      description: `Propose the live streams of one tournament stage. Nothing changes until a staff member approves it in the admin app. Read get_tournament first. ${STREAMS_NOTE}`,
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.string().uuid().describe("Tournament stage UUID."),
        streams: streamsSchema,
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ tournamentId, streams, sourceUrl }, user) =>
        propose({ kind: "set_tournament_streams", tournamentId, streams }, sourceUrl, user.id),
    }),

    defineTool({
      name: "set_match_streams",
      description: `Propose the live streams of one match, for a series broadcast on another channel than its tournament (a B stream, a regional channel). Nothing changes until a staff member approves it in the admin app. ${STREAMS_NOTE}`,
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.string().uuid().describe("Match UUID."),
        streams: streamsSchema,
        sourceUrl: sourceUrlSchema,
      },
      handler: ({ matchId, streams, sourceUrl }, user) =>
        propose({ kind: "set_match_streams", matchId, streams }, sourceUrl, user.id),
    }),

    defineTool({
      name: "propose_delete_match",
      description:
        "Propose deleting a match that should not exist, such as a series imported twice. Nothing is deleted until a staff member approves it in the admin app. Once approved, the match is deleted with its scores, its incoming bracket links and its game stats, and standings and team records are recomputed from the remaining matches. PandaScore and start.gg matches are refused, and so are matches with pick'em picks, comments or bracket matches fed by them. Read get_tournament first and run list_roster_proposals to avoid proposing it twice.",
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.string().uuid().describe("Match UUID."),
        reason: reasonSchema,
        sourceUrl: sourceUrlSchema
          .optional()
          .describe(
            "Optional public source showing the correct results, such as the official bracket. Never Liquipedia.",
          ),
      },
      handler: async ({ matchId, reason, sourceUrl }, user) =>
        proposed(
          await rosterProposalService.propose(
            { kind: "delete_match", matchId, reason },
            sourceUrl ?? "",
            user.id,
          ),
          sourceUrl,
        ),
    }),

    defineTool({
      name: "propose_delete_team",
      description:
        "Propose removing a team created by mistake, such as an empty duplicate. Nothing is deleted until a staff member approves it in the admin app. Without mergeIntoTeamId, approval deletes the team, and both the proposal and the approval are refused for a PandaScore team or a team with current players, contracts, tournament participations, matches or prizes. With mergeIntoTeamId, approval merges the team into that one instead, like merge_teams: its references move there and it stays as a redirect. Run search_teams and list_roster_proposals first.",
      write: true,
      permission: "teams.manage",
      input: {
        teamId: z.string().uuid().describe("UUID of the team to remove."),
        reason: reasonSchema,
        mergeIntoTeamId: z
          .string()
          .uuid()
          .optional()
          .describe("UUID of the team this one duplicates. Its references move there on approval."),
      },
      handler: async ({ teamId, reason, mergeIntoTeamId }, user) =>
        proposed(
          await rosterProposalService.propose(
            { kind: "delete_team", teamId, reason, mergeIntoTeamId },
            "",
            user.id,
          ),
          undefined,
        ),
    }),

    defineTool({
      name: "list_roster_proposals",
      description: `List roster proposals, ${DEFAULT_PROPOSAL_STATUS} by default. Check pending proposals before proposing a change so the same player, team or move is not proposed twice. Applied proposals carry the created or updated entityId.`,
      permission: ROSTER_PROPOSAL_PERMISSIONS,
      input: {
        status: z
          .enum(ROSTER_PROPOSAL_STATUSES)
          .optional()
          .describe(`Proposal status (default ${DEFAULT_PROPOSAL_STATUS}).`),
      },
      handler: async ({ status }) => {
        const { proposals, names } = await rosterProposalService.list(
          status ?? DEFAULT_PROPOSAL_STATUS,
        );
        return {
          proposals: proposals.map((proposal) => ({
            id: proposal.id,
            change: redistributableChange(proposal.change, proposal.sourceUrl),
            sourceUrl: proposal.sourceUrl,
            status: proposal.status,
            entityId: proposal.entityId,
            createdAt: proposal.createdAt,
          })),
          names,
        };
      },
    }),
  ];
}
