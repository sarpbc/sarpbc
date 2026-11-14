import { z } from "zod";
import {
  CONTRACT_ROLES,
  PLAYER_AWARD_TYPES,
  PLAYER_STATUSES,
  ROSTER_PROPOSAL_STATUSES,
  SEASON_AWARD_TYPES,
  STREAM_KINDS,
  TEAM_LOGO_VARIANTS,
  VIEWERSHIP_SCOPES,
  type PlayerStatus,
  type RosterChange,
  type RosterProposalStatus,
} from "@sarpbc/types";
import {
  MAX_LINEUP_PLAYERS,
  MAX_CIRCUIT_PLACEMENT,
  MAX_CIRCUIT_POINTS,
  MAX_CIRCUIT_SCALE_TIERS,
  MAX_CIRCUIT_STAGE_TEAMS,
  MAX_STREAMS,
  ROSTER_PROPOSAL_PERMISSIONS,
  MAX_VIEWERS,
  SEASON_AWARD_PRESENTER_MAX_LENGTH,
  SEASON_AWARD_REGION_MAX_LENGTH,
  SEASON_AWARD_SOURCE_URL_MAX_LENGTH,
  STREAM_CHANNEL_MAX_LENGTH,
  TEAM_ALIAS_NAME_MAX_LENGTH,
  TEAM_ALIAS_URL_MAX_LENGTH,
  VIEWERSHIP_SOURCE_NAME_MAX_LENGTH,
  isForbiddenViewershipSource,
  isLiquipediaSourceHost,
} from "@sarpbc/utils";
import { isRedistributable, sourceFromUrl } from "../../../common/domain/data-source";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { MAX_TEAM_LOGO_BYTES, MIN_TEAM_LOGO_PIXELS } from "../../../roster/domain/team-logo";
import type { RosterProposalService } from "../../../roster-proposal/application/roster-proposal.service";
import { defineTool, type McpTool } from "../define-tool";
import { proposalSourceUrlSchema as sourceUrlSchema, proposed, proposer } from "./proposals";
import { requireUpdateFields } from "./update-fields";

const DEFAULT_PLAYER_STATUS = "free_agent" satisfies PlayerStatus;
const DEFAULT_PROPOSAL_STATUS = "pending" satisfies RosterProposalStatus;

const withoutLiquipedia = (use: string) =>
  [
    (url: string) => !URL.canParse(url) || !isLiquipediaSourceHost(new URL(url).hostname),
    `Liquipedia is not an accepted source; ${use}`,
  ] as const;

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

const circuitPlacement = z.number().int().min(1).max(MAX_CIRCUIT_PLACEMENT);

const circuitScaleSchema = z
  .array(
    z.object({
      from: circuitPlacement.describe("Best placement of the range (1 for the winner)."),
      to: circuitPlacement.describe("Worst placement of the range; equal to from for one place."),
      points: z
        .number()
        .int()
        .min(0)
        .max(MAX_CIRCUIT_POINTS)
        .describe("Points awarded to every team finishing in this range."),
    }),
  )
  .max(MAX_CIRCUIT_SCALE_TIERS)
  .describe(
    "The complete official scale of this stage, copied from the cited source; ranges must not overlap. Never estimate or invent points. An empty list keeps the stage in the circuit without awarding points.",
  );

const circuitSourceUrlSchema = sourceUrlSchema.describe(
  "Required public page of the official rules or announcement that publishes the scale. Never Liquipedia, a mirror of it or BLAST.tv.",
);

const circuitWorldwideSchema = z
  .boolean()
  .describe(
    "True when the stage is open to teams of every region, such as a Major or a world championship. In a regional circuit such a stage credits only the teams listed in regionTeamIds; in a worldwide circuit it credits every team. Omit or false for a stage of the circuit's own region, such as a regional Open.",
  );

const circuitRegionTeamsSchema = z
  .array(z.uuid())
  .max(MAX_CIRCUIT_STAGE_TEAMS)
  .describe(
    "UUIDs of the teams of the circuit's region that took part in this worldwide stage. Only they earn points from it in a regional circuit. Each team must have played a stage of the same event. Omitted means none.",
  );

const circuitFinishesSchema = z
  .array(
    z.object({
      teamId: z.uuid().describe("UUID of a team that played a stage of the same event."),
      placement: circuitPlacement.describe(
        "The team's official final placement in the whole event, e.g. 9 for a 9th-12th finish.",
      ),
    }),
  )
  .max(MAX_CIRCUIT_STAGE_TEAMS)
  .describe(
    "Official final placements in the event that this stage's own placements do not hold, such as the 9th-16th places decided in groups or pools before the playoffs. Each entry replaces the stage placement of its team and is scored with this stage's scale. Use the placement the official rules give (e.g. 9 for every team eliminated in the GSL lower semi-finals of a 16-team Open). Never estimate. Omitted means none.",
  );

const STREAMS_NOTE =
  "An event list is inherited by its tournaments that have no list of their own, and a tournament list by its matches that have none; a list set lower down replaces the inherited one entirely. PandaScore entities are accepted. start.gg tournaments and matches are refused. A start.gg sourceUrl marks the streams as start.gg data: the site shows them with credit and they stay out of the MCP.";

const viewershipSourceUrlSchema = sourceUrlSchema
  .regex(/^https:\/\//, "Use an https URL")
  .refine(
    (url) => !URL.canParse(url) || !isForbiddenViewershipSource(new URL(url).hostname),
    "Liquipedia, BLAST.tv and start.gg are not accepted viewership sources",
  )
  .describe(
    "Required public https page that states the numbers, such as an Esports Charts page or a public viewer counter. It is shown on the site as the credit. Never Liquipedia, BLAST.tv or start.gg.",
  );

const viewershipInput = {
  peakViewers: z.number().int().min(0).max(MAX_VIEWERS).describe("Peak concurrent viewers."),
  averageViewers: z
    .number()
    .int()
    .min(0)
    .max(MAX_VIEWERS)
    .optional()
    .describe("Average concurrent viewers, when the source states it. At most peakViewers."),
  scope: z
    .enum(VIEWERSHIP_SCOPES)
    .describe(
      "official when the numbers cover the official broadcasts only, with_costreams when they include co-streams.",
    ),
  measuredAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("When the source measured the peak (ISO 8601 date-time), if it says so."),
  sourceName: z
    .string()
    .trim()
    .min(1)
    .max(VIEWERSHIP_SOURCE_NAME_MAX_LENGTH)
    .describe("Name of the source to credit next to the numbers (e.g. Esports Charts)."),
  sourceUrl: viewershipSourceUrlSchema,
};

const VIEWERSHIP_NOTE =
  "Once approved, it replaces the current numbers. Enter only numbers a public source states; no replay statistics. PandaScore entities are accepted. start.gg tournaments and matches are refused.";

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

const aliasSourceUrlSchema = sourceUrlSchema.describe(
  "Required official source for the name and its dates: the team, one of its players, the organiser, RLEsports or PandaScore. Never Liquipedia, a mirror of it or BLAST.tv, not even as a lead.",
);

const teamAliasInput = {
  teamId: z.uuid().describe("UUID of the team that used the name."),
  name: z.string().trim().min(1).max(TEAM_ALIAS_NAME_MAX_LENGTH).describe("The former name."),
  from: contractDateSchema.describe("First day the team used the name (YYYY-MM-DD)."),
  to: contractDateSchema
    .optional()
    .describe(
      "Day the team stopped using the name, such as the rebrand date (YYYY-MM-DD). Omit while the name is still in use.",
    ),
  logoUrl: z
    .url()
    .max(TEAM_ALIAS_URL_MAX_LENGTH)
    .regex(/^https:\/\//, "Use an https URL")
    .refine(...withoutLiquipedia("use the team's official asset"))
    .optional()
    .describe("Optional https URL of the official logo used with this name. Never Liquipedia."),
  pandascoreId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Optional id of a separate PandaScore team record that carried this name, so PandaScore imports of it land on this team.",
    ),
  sourceUrl: aliasSourceUrlSchema,
};

const ALIAS_NOTE =
  "Use this for a rebrand or a sponsor name, never merge_teams or create_team. Past tournaments and matches then show the name in force on their date, and search finds the team by it. Only record names and dates the source states.";

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

const LOGO_LIMITS = `at most ${MAX_TEAM_LOGO_BYTES / (1024 * 1024)} MB, at least ${MIN_TEAM_LOGO_PIXELS}x${MIN_TEAM_LOGO_PIXELS} pixels`;

export interface RosterToolServices {
  rosterProposalService: Pick<RosterProposalService, "propose" | "proposeTeamLogo" | "list">;
}

function redistributableChange(change: RosterChange, sourceUrl: string): RosterChange {
  if (
    change.kind === "set_event_streams" ||
    change.kind === "set_tournament_streams" ||
    change.kind === "set_match_streams"
  ) {
    return isRedistributable(sourceFromUrl(sourceUrl)) ? change : { ...change, streams: [] };
  }

  return change;
}

export function rosterTools({ rosterProposalService }: RosterToolServices): McpTool[] {
  const propose = proposer(rosterProposalService);

  return [
    defineTool({
      name: "add_player_to_team",
      description:
        "Propose adding a player or staff member to a team's current roster. Once approved, closes the player's open contracts at effectiveDate and opens a new one with the given role, so roster history is kept. Use the same team with a new role when a player changes role there, for example from active to benched or from player to coach; the same team and role is rejected. Check get_player and get_team first.",
      write: true,
      permission: "players.manage",
      input: {
        playerId: z.uuid().describe("Player UUID."),
        teamId: z.uuid().describe("Team UUID."),
        effectiveDate: effectiveDateSchema,
        role: contractRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ sourceUrl, role, ...input }, user) =>
        await propose(
          { kind: "add_player_to_team", ...input, contractRole: role },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "remove_player_from_team",
      description:
        "Propose removing a player from a team's current roster. Once approved, closes the open contract at effectiveDate instead of deleting it and sets the player's status.",
      write: true,
      permission: "players.manage",
      input: {
        playerId: z.uuid().describe("Player UUID."),
        teamId: z.uuid().describe("Team UUID the player leaves."),
        effectiveDate: effectiveDateSchema,
        sourceUrl: sourceUrlSchema,
        status: z
          .enum(["free_agent", "retired"])
          .optional()
          .describe(`Status after leaving. Defaults to ${DEFAULT_PLAYER_STATUS}.`),
      },
      handler: async ({ sourceUrl, status, ...input }, user) =>
        await propose(
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
      handler: async ({ name, country, status, sourceUrl }, user) =>
        await propose(
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
        playerId: z.uuid().describe("Player UUID."),
        name: z.string().min(1).max(255).optional().describe("In-game name."),
        country: countrySchema.optional(),
        status: playerStatusSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ playerId, name, country, status, sourceUrl }, user) => {
        requireUpdateFields({ name, country, status });

        return await propose(
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
        imageUrl: z.url().max(255).optional().describe("Logo URL."),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ name, country, imageUrl, sourceUrl }, user) =>
        await propose(
          { kind: "create_team", name, location: country, imageUrl },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "update_team",
      description:
        "Propose updating a team's name, country, or logo URL, or marking it inactive. Prefer upload_team_logo for logos. Remove current players before setting active to false. Use propose_delete_team only for a team created by mistake.",
      write: true,
      permission: "teams.manage",
      input: {
        teamId: z.uuid().describe("Team UUID."),
        name: z.string().min(1).max(255).optional().describe("Team name."),
        country: countrySchema.optional(),
        imageUrl: z.url().max(255).optional().describe("Logo URL."),
        active: z.boolean().optional().describe("False marks a disbanded team inactive."),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ teamId, name, country, imageUrl, active, sourceUrl }, user) => {
        requireUpdateFields({ name, country, imageUrl, active });

        return await propose(
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
        teamId: z.uuid().describe("Team UUID."),
        variant: z
          .enum(TEAM_LOGO_VARIANTS)
          .describe("light for display on light backgrounds, dark for dark backgrounds."),
        imageUrl: z
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
      name: "add_team_alias",
      description: `Propose a dated former name of a team. Nothing changes until a staff member approves it in the admin app; periods of one team must not overlap. Read list_team_aliases and list_roster_proposals first. ${ALIAS_NOTE}`,
      write: true,
      permission: "teams.manage",
      input: teamAliasInput,
      handler: async ({ teamId, to, logoUrl, pandascoreId, sourceUrl, ...alias }, user) =>
        await propose(
          {
            kind: "add_team_alias",
            teamId,
            alias: {
              ...alias,
              to: to ?? null,
              logoUrl: logoUrl ?? null,
              pandascoreId: pandascoreId ?? null,
            },
          },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "update_team_alias",
      description: `Propose correcting a team's former name. Take aliasId from list_team_aliases. Once approved, it replaces every field of the alias, so pass the ones to keep too; the sourceUrl becomes its source. ${ALIAS_NOTE}`,
      write: true,
      permission: "teams.manage",
      input: {
        aliasId: z.uuid().describe("Alias UUID from list_team_aliases."),
        ...teamAliasInput,
      },
      handler: async ({ teamId, aliasId, to, logoUrl, pandascoreId, sourceUrl, ...alias }, user) =>
        await propose(
          {
            kind: "update_team_alias",
            teamId,
            aliasId,
            alias: {
              ...alias,
              to: to ?? null,
              logoUrl: logoUrl ?? null,
              pandascoreId: pandascoreId ?? null,
            },
          },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "merge_players",
      description:
        "Propose merging a duplicate player into the player to keep. Once approved, contracts, photos, awards and tournament rosters move to the kept player, and the duplicate stays as a redirect to it instead of being deleted. Fails when both are distinct PandaScore players or play for different current teams.",
      write: true,
      permission: "players.manage",
      input: {
        keptPlayerId: z.uuid().describe("UUID of the player to keep."),
        duplicatePlayerId: z.uuid().describe("UUID of the duplicate to merge into it."),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ keptPlayerId, duplicatePlayerId, sourceUrl }, user) =>
        await propose(
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
        keptTeamId: z.uuid().describe("UUID of the team to keep."),
        duplicateTeamId: z.uuid().describe("UUID of the duplicate to merge into it."),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ keptTeamId, duplicateTeamId, sourceUrl }, user) =>
        await propose(
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
        playerId: z.uuid().describe("Player UUID."),
        teamId: z.uuid().describe("Team UUID."),
        startDate: contractDateSchema.describe("Date the player joined (YYYY-MM-DD)."),
        endDate: contractDateSchema
          .optional()
          .describe("Date the player left (YYYY-MM-DD). Omit only for the current team."),
        role: contractRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ playerId, teamId, startDate, endDate, role, sourceUrl }, user) => {
        if (endDate !== undefined && endDate !== "" && endDate < startDate) {
          throw new InvalidInputError("endDate must not precede startDate.");
        }

        return await propose(
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
        playerId: z.uuid().describe("UUID of the player the contract belongs to."),
        contractId: z.uuid().describe("Contract UUID from list_contracts."),
        teamId: z.uuid().optional().describe("Corrected team UUID."),
        startDate: contractDateSchema.optional().describe("Corrected start date (YYYY-MM-DD)."),
        endDate: contractDateSchema
          .nullable()
          .optional()
          .describe("Corrected end date (YYYY-MM-DD), or null to reopen."),
        role: contractRoleSchema.optional(),
        sourceUrl: sourceUrlSchema,
      },
      handler: async (
        { playerId, contractId, teamId, startDate, endDate, role, sourceUrl },
        user,
      ) => {
        requireUpdateFields({ teamId, startDate, endDate, role });

        return await propose(
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
      name: "propose_player_award",
      description:
        "Propose a player award of one tournament stage. Only propose awards the organiser officially announced. Use mvp for the tournament or World Championship MVP and grand_finals_mvp for a separate Grand Finals MVP. Read get_tournament_awards first: a stage holds several awards but at most one of each type. The team must be a participant of the stage and the player must be on that team's stage roster. start.gg tournaments are refused.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.uuid().describe("Tournament stage UUID."),
        teamId: z.uuid().describe("UUID of the team the player represented."),
        playerId: z.uuid().describe("Player UUID."),
        awardType: z
          .enum(PLAYER_AWARD_TYPES)
          .describe(
            "Award type: mvp, grand_finals_mvp, offensive_mvp, defensive_mvp or breakthrough_player.",
          ),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ tournamentId, teamId, playerId, awardType, sourceUrl }, user) =>
        await propose(
          { kind: "award_player", tournamentId, teamId, playerId, awardType },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "propose_season_award",
      description:
        "Propose a player award of a season or league rather than of one tournament stage: season_mvp for the Season MVP, regular_season_mvp for the Regular Season MVP and regional_mvp for the MVP of one region. Only propose awards announced by an official account (RLEsports, BLAST, the organiser or the league). Staff create seasons in the admin app; read list_seasons and get_season first. A season holds one award of each type and one regional_mvp per region.",
      write: true,
      permission: "tournaments.manage",
      input: {
        seasonId: z.uuid().describe("Season UUID from list_seasons."),
        playerId: z.uuid().describe("Player UUID."),
        awardType: z
          .enum(SEASON_AWARD_TYPES)
          .describe("Award type: season_mvp, regular_season_mvp or regional_mvp."),
        region: z
          .string()
          .trim()
          .min(1)
          .max(SEASON_AWARD_REGION_MAX_LENGTH)
          .optional()
          .describe(
            "Region as the announcement names it (e.g. Europe). Required for regional_mvp, optional for regular_season_mvp and refused for season_mvp.",
          ),
        presentedBy: z
          .string()
          .trim()
          .min(1)
          .max(SEASON_AWARD_PRESENTER_MAX_LENGTH)
          .optional()
          .describe("Partner presenting the award when the announcement names one (e.g. Ally)."),
        sourceUrl: sourceUrlSchema
          .max(SEASON_AWARD_SOURCE_URL_MAX_LENGTH)
          .describe(
            "Required official announcement of the award: an RLEsports, BLAST, organiser or league post or page. Never Liquipedia.",
          ),
      },
      handler: async ({ seasonId, playerId, awardType, region, presentedBy, sourceUrl }, user) =>
        await propose(
          { kind: "award_season_player", seasonId, playerId, awardType, region, presentedBy },
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
        eventId: z.uuid().describe("Event UUID."),
        streams: streamsSchema,
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ eventId, streams, sourceUrl }, user) =>
        await propose({ kind: "set_event_streams", eventId, streams }, sourceUrl, user.id),
    }),

    defineTool({
      name: "set_tournament_streams",
      description: `Propose the live streams of one tournament stage. Nothing changes until a staff member approves it in the admin app. Read get_tournament first. ${STREAMS_NOTE}`,
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.uuid().describe("Tournament stage UUID."),
        streams: streamsSchema,
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ tournamentId, streams, sourceUrl }, user) =>
        await propose(
          { kind: "set_tournament_streams", tournamentId, streams },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "set_match_streams",
      description: `Propose the live streams of one match, for a series broadcast on another channel than its tournament (a B stream, a regional channel). Nothing changes until a staff member approves it in the admin app. ${STREAMS_NOTE}`,
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.uuid().describe("Match UUID."),
        streams: streamsSchema,
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ matchId, streams, sourceUrl }, user) =>
        await propose({ kind: "set_match_streams", matchId, streams }, sourceUrl, user.id),
    }),

    defineTool({
      name: "set_match_lineups",
      description:
        "Propose the lineups of one match (series): for each participant, the players who actually played, substitutes and stand-ins included. Nothing changes until a staff member approves it in the admin app; once approved it replaces every lineup of the match, and a participant left out has no lineup. Read get_tournament for the participant ids and rosters and get_match_lineups for the current lineups. A player outside the participant's tournament roster is shown as a stand-in. Every player must already exist: use search_players, and create_player first if needed. start.gg matches and start.gg sources are refused.",
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.uuid().describe("Match UUID."),
        lineups: z
          .array(
            z.object({
              participantId: z
                .string()
                .min(1)
                .describe(
                  "Tournament participant id of one side of the match, from get_tournament.",
                ),
              playerIds: z
                .array(z.uuid())
                .max(MAX_LINEUP_PLAYERS)
                .describe("Player UUIDs who played for this participant, in lineup order."),
            }),
          )
          .max(2)
          .describe("One entry per side of the match."),
        sourceUrl: sourceUrlSchema,
      },
      handler: async ({ matchId, lineups, sourceUrl }, user) =>
        await propose({ kind: "set_match_lineups", matchId, lineups }, sourceUrl, user.id),
    }),

    defineTool({
      name: "set_circuit_stage_scale",
      description:
        "Propose the official points scale of one tournament stage in a points circuit, adding the stage to the circuit if needed; once approved it replaces the stage's whole settings. Nothing changes until a staff member approves it in the admin app. Points are then computed from the final placements of that stage (PandaScore standings) and from the final placements listed in finishes. PandaScore, manual and start.gg stages are accepted. A start.gg stage counts only on staff surfaces: the public site, get_circuit and list_circuits never show it or its points. Read get_circuit and get_tournament first.",
      write: true,
      permission: "tournaments.manage",
      input: {
        circuitId: z.uuid().describe("Circuit UUID from list_circuits or create_circuit."),
        tournamentId: z
          .uuid()
          .describe("Tournament stage UUID, usually the final stage (playoffs) of the event."),
        scale: circuitScaleSchema,
        worldwide: circuitWorldwideSchema.optional(),
        regionTeamIds: circuitRegionTeamsSchema.optional(),
        finishes: circuitFinishesSchema.optional(),
        sourceUrl: circuitSourceUrlSchema,
      },
      handler: async (
        { circuitId, tournamentId, scale, worldwide, regionTeamIds, finishes, sourceUrl },
        user,
      ) =>
        await propose(
          {
            kind: "set_circuit_stage_scale",
            circuitId,
            tournamentId,
            scale,
            worldwide,
            regionTeamIds,
            finishes,
          },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "propose_delete_match",
      description:
        "Propose deleting a match that should not exist, such as a series imported twice. Nothing is deleted until a staff member approves it in the admin app. Once approved, the match is deleted with its scores, its incoming bracket links and its game stats, and standings and team records are recomputed from the remaining matches. PandaScore and start.gg matches are refused, and so are matches with pick'em picks, comments or bracket matches fed by them. Read get_tournament first and run list_roster_proposals to avoid proposing it twice.",
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.uuid().describe("Match UUID."),
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
        teamId: z.uuid().describe("UUID of the team to remove."),
        reason: reasonSchema,
        mergeIntoTeamId: z
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
      name: "set_event_viewership",
      description: `Propose the viewership of a tournament event: peak and average viewers, with the source credited on the site. Nothing changes until a staff member approves it in the admin app. Read get_event first. ${VIEWERSHIP_NOTE}`,
      write: true,
      permission: "tournaments.manage",
      input: { eventId: z.uuid().describe("Event UUID."), ...viewershipInput },
      handler: async ({ eventId, averageViewers, measuredAt, sourceUrl, ...rest }, user) =>
        await propose(
          {
            kind: "set_event_viewership",
            eventId,
            viewership: {
              ...rest,
              averageViewers: averageViewers ?? null,
              measuredAt: measuredAt ?? null,
              sourceUrl,
            },
          },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "set_match_viewership",
      description: `Propose the viewership of one match: peak and average viewers, with the source credited on the site. Nothing changes until a staff member approves it in the admin app. ${VIEWERSHIP_NOTE}`,
      write: true,
      permission: "tournaments.manage",
      input: { matchId: z.uuid().describe("Match UUID."), ...viewershipInput },
      handler: async ({ matchId, averageViewers, measuredAt, sourceUrl, ...rest }, user) =>
        await propose(
          {
            kind: "set_match_viewership",
            matchId,
            viewership: {
              ...rest,
              averageViewers: averageViewers ?? null,
              measuredAt: measuredAt ?? null,
              sourceUrl,
            },
          },
          sourceUrl,
          user.id,
        ),
    }),

    defineTool({
      name: "list_roster_proposals",
      description: `List every staff-reviewed proposal (players, teams, contracts, prizes, awards, streams, lineups, viewership, circuits, deletions), ${DEFAULT_PROPOSAL_STATUS} by default, with its change, status and sourceUrl. Check pending proposals before proposing a change so the same change is not proposed twice. Applied proposals carry the created or updated entityId.`,
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
