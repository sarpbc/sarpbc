import type {
  CircuitStageScaleInput,
  PrizeEntry,
  ProposedPrizeEntry,
  RosterChange,
  RosterProposalStatus,
  StreamInput,
  TeamLogoVariant,
} from "@sarpbc/types";
import { requiredPermission } from "@sarpbc/utils";
import { isRedistributable, sourceFromUrl } from "../../common/domain/data-source";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { ContractService } from "../../roster/application/contract.service";
import type { PlayerService } from "../../roster/application/player.service";
import type { RosterMergeService } from "../../roster/application/roster-merge.service";
import type { TeamLogoService } from "../../roster/application/team-logo.service";
import type { TeamService } from "../../roster/application/team.service";
import type { TeamAliasService } from "../../roster/application/team-alias.service";
import { teamLogoField } from "../../roster/domain/team-logo";
import { RosterProposal } from "../domain/roster-proposal";
import type { UserService } from "../../user/application/user.service";
import type { MatchService } from "../../tournament/application/match/match.service";
import type { MatchLineupService } from "../../tournament/application/match/match-lineup.service";
import type { PlayerAwardService } from "../../tournament/application/player-award.service";
import type { StreamService } from "../../tournament/application/stream.service";
import type { ViewershipService } from "../../tournament/application/viewership.service";
import type { CircuitService } from "../../circuit/application/circuit.service";
import type { SeasonService } from "../../season/application/season.service";
import type { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import type { StreamOwner } from "../../tournament/domain/stream";
import { assertPrizeDistribution } from "../../tournament/domain/prize-distribution";
import type { RosterProposalTransaction, RosterProposalStore } from "./ports";

export interface RosterProposalList {
  proposals: RosterProposal[];
  names: Record<string, string>;
}

type Players = Pick<PlayerService, "findById" | "create" | "update" | "joinTeam" | "leaveTeam">;
type Teams = Pick<TeamService, "findById" | "create" | "update" | "requireDeletable" | "delete">;
type Contracts = Pick<ContractService, "getContractsByPlayer" | "recordPeriod" | "revisePeriod">;
type Merges = Pick<RosterMergeService, "mergePlayers" | "mergeTeams">;
type Staff = Pick<UserService, "hasAnyPermission">;
type Prizes = Pick<
  TournamentPrizeService,
  "requireProposableTournament" | "requireProposablePrize" | "setDistribution" | "updateEntry"
>;
type Awards = Pick<PlayerAwardService, "requireProposable" | "createForTeam">;
type Logos = Pick<TeamLogoService, "upload" | "publish" | "discard">;
type Matches = Pick<MatchService, "requireProposableDeletion" | "deleteMatch">;
type Streams = Pick<StreamService, "requireProposable" | "set">;
type Lineups = Pick<MatchLineupService, "requireProposable" | "set">;
type Viewerships = Pick<ViewershipService, "requireProposable" | "set">;
type Circuits = Pick<CircuitService, "requireStageSettings" | "setStageScale">;
type TeamAliases = Pick<TeamAliasService, "requireProposable" | "add" | "update">;
type Seasons = Pick<SeasonService, "requireAward" | "addAward">;
type CircuitStageChange = Extract<RosterChange, { kind: "set_circuit_stage_scale" }>;

function circuitStageInput(
  { scale, worldwide, regionTeamIds, finishes }: CircuitStageChange,
  sourceUrl: string,
): CircuitStageScaleInput {
  return { scale, sourceUrl, worldwide, regionTeamIds, finishes };
}

interface StreamChange {
  owner: StreamOwner;
  streams: StreamInput[];
}

export interface TeamLogoProposal {
  teamId: string;
  variant: TeamLogoVariant;
  imageUrl: string;
}

const LIST_LIMIT = 100;

export class RosterProposalService {
  constructor(
    private readonly store: RosterProposalStore,
    private readonly transaction: RosterProposalTransaction,
    private readonly players: Players,
    private readonly teams: Teams,
    private readonly contracts: Contracts,
    private readonly merges: Merges,
    private readonly staff: Staff,
    private readonly prizes: Prizes,
    private readonly awards: Awards,
    private readonly logos: Logos,
    private readonly matches: Matches,
    private readonly streams: Streams,
    private readonly lineups: Lineups,
    private readonly viewerships: Viewerships,
    private readonly circuits: Circuits,
    private readonly teamAliases: TeamAliases,
    private readonly seasons: Seasons,
  ) {}

  async propose(
    change: RosterChange,
    sourceUrl: string,
    proposedById: string,
  ): Promise<RosterProposal> {
    await this.requireReferences(change);
    if (change.kind === "update_contract") {
      await this.requireContract(change.playerId, change.contractId);
    }
    if (change.kind === "set_tournament_prizes") {
      assertPrizeDistribution(sourcedPrizes(change.prizes, sourceUrl));
      await this.prizes.requireProposableTournament(change.tournamentId);
    }
    if (change.kind === "update_tournament_prize") {
      await this.prizes.requireProposablePrize(change.tournamentId, change.teamId);
    }
    if (change.kind === "award_player") {
      const { tournamentId, teamId, playerId, awardType } = change;
      await this.awards.requireProposable(tournamentId, teamId, playerId, awardType);
    }
    if (change.kind === "award_season_player") {
      const { kind: _, seasonId, ...award } = change;
      await this.seasons.requireAward(seasonId, { ...award, sourceUrl });
    }
    if (change.kind === "delete_match") {
      await this.matches.requireProposableDeletion(change.matchId);
    }
    if (change.kind === "set_match_lineups") {
      if (!isRedistributable(sourceFromUrl(sourceUrl)))
        throw new InvalidInputError("Lineups sourced from start.gg cannot be proposed");
      await this.lineups.requireProposable(change.matchId, change.lineups);
    }
    const streamChange = streamChangeOf(change);
    if (streamChange) {
      await this.streams.requireProposable(streamChange.owner, streamChange.streams);
    }
    if (change.kind === "set_event_viewership") {
      await this.viewerships.requireProposable(
        { kind: "event", id: change.eventId },
        change.viewership,
      );
    }
    if (change.kind === "set_match_viewership") {
      await this.viewerships.requireProposable(
        { kind: "match", id: change.matchId },
        change.viewership,
      );
    }
    if (change.kind === "set_circuit_stage_scale") {
      await this.circuits.requireStageSettings(
        change.circuitId,
        change.tournamentId,
        circuitStageInput(change, sourceUrl),
      );
    }
    if (change.kind === "add_team_alias") {
      await this.teamAliases.requireProposable(change.teamId, { ...change.alias, sourceUrl });
    }
    if (change.kind === "update_team_alias") {
      const { teamId, aliasId, alias } = change;
      await this.teamAliases.requireProposable(teamId, { ...alias, sourceUrl }, aliasId);
    }
    if (change.kind === "delete_team") {
      await this.requireTeamRemoval(change.teamId, change.mergeIntoTeamId);
    }
    const proposal = Object.assign(new RosterProposal(), { change, sourceUrl, proposedById });
    await this.store.save(proposal);
    return proposal;
  }

  async proposeTeamLogo(
    { teamId, variant, imageUrl }: TeamLogoProposal,
    sourceUrl: string,
    proposedById: string,
  ): Promise<RosterProposal> {
    await this.requireTeam(teamId);
    const logo = await this.logos.upload(teamId, variant, imageUrl);
    try {
      return await this.propose(
        {
          kind: "upload_team_logo",
          teamId,
          variant,
          imageUrl,
          logoKey: logo.key,
          logoUrl: logo.url,
        },
        sourceUrl,
        proposedById,
      );
    } catch (error) {
      await this.logos.discard(logo.key);
      throw error;
    }
  }

  async list(status: RosterProposalStatus): Promise<RosterProposalList> {
    const proposals = await this.store.list(status, LIST_LIMIT);
    const names = await this.store.names({
      players: [...new Set(proposals.flatMap(({ change }) => referencedPlayerIds(change)))],
      teams: [...new Set(proposals.flatMap(({ change }) => referencedTeamIds(change)))],
      users: [...new Set(proposals.map(({ proposedById }) => proposedById))],
      matches: [
        ...new Set(
          proposals.flatMap(({ change }) =>
            change.kind === "delete_match" ||
            change.kind === "set_match_streams" ||
            change.kind === "set_match_lineups" ||
            change.kind === "set_match_viewership"
              ? [change.matchId]
              : [],
          ),
        ),
      ],
      tournaments: [
        ...new Set(
          proposals.flatMap(({ change }) =>
            change.kind === "set_tournament_prizes" ||
            change.kind === "update_tournament_prize" ||
            change.kind === "award_player" ||
            change.kind === "set_tournament_streams" ||
            change.kind === "set_circuit_stage_scale"
              ? [change.tournamentId]
              : [],
          ),
        ),
      ],
      events: [
        ...new Set(
          proposals.flatMap(({ change }) =>
            change.kind === "set_event_streams" || change.kind === "set_event_viewership"
              ? [change.eventId]
              : [],
          ),
        ),
      ],
      circuits: [
        ...new Set(
          proposals.flatMap(({ change }) =>
            change.kind === "set_circuit_stage_scale" ? [change.circuitId] : [],
          ),
        ),
      ],
      seasons: [
        ...new Set(
          proposals.flatMap(({ change }) =>
            change.kind === "award_season_player" ? [change.seasonId] : [],
          ),
        ),
      ],
    });
    return { proposals, names };
  }

  async approve(id: string, reviewerId: string): Promise<RosterProposal> {
    return this.transaction.run(async (proposals) => {
      const proposal = await this.reviewable(proposals, id, reviewerId);
      // A merge approved since the proposal would leave the change on a redirect record.
      await this.requireReferences(proposal.change);
      proposal.approve(reviewerId, new Date());
      if (proposal.change.kind === "upload_team_logo") {
        const published = await this.logos.publish(proposal.change.logoKey);
        proposal.change = { ...proposal.change, logoKey: published.key, logoUrl: published.url };
      }
      proposal.entityId = await this.apply(proposal.change, proposal.sourceUrl);
      await proposals.save(proposal);
      return proposal;
    });
  }

  async reject(id: string, reviewerId: string): Promise<RosterProposal> {
    return this.transaction.run(async (proposals) => {
      const proposal = await this.reviewable(proposals, id, reviewerId);
      proposal.reject(reviewerId, new Date());
      if (proposal.change.kind === "upload_team_logo") {
        await this.logos.discard(proposal.change.logoKey);
      }
      await proposals.save(proposal);
      return proposal;
    });
  }

  private async reviewable(
    proposals: RosterProposalStore,
    id: string,
    reviewerId: string,
  ): Promise<RosterProposal> {
    const proposal = await proposals.findById(id);
    if (!proposal) throw new NotFoundError(`Roster proposal "${id}" not found`);
    const permission = requiredPermission(proposal.change);
    if (!(await this.staff.hasAnyPermission(reviewerId, [permission]))) {
      throw new ForbiddenError(`Reviewing this proposal requires ${permission}`);
    }
    return proposal;
  }

  private async apply(change: RosterChange, sourceUrl: string): Promise<string> {
    switch (change.kind) {
      case "add_player_to_team": {
        const { playerId, teamId, effectiveDate, contractRole } = change;
        await this.players.joinTeam(playerId, {
          teamId,
          effectiveDate,
          sourceUrl,
          role: contractRole,
        });
        return playerId;
      }
      case "remove_player_from_team": {
        const { playerId, teamId, effectiveDate, status } = change;
        await this.players.leaveTeam(playerId, { teamId, effectiveDate, sourceUrl, status });
        return playerId;
      }
      case "create_player": {
        const { kind: _, ...input } = change;
        return (await this.players.create({ ...input, source: sourceFromUrl(sourceUrl) })).id;
      }
      case "update_player": {
        const { kind: _, playerId, ...input } = change;
        return (await this.players.update(playerId, input)).id;
      }
      case "create_team": {
        const { kind: _, ...input } = change;
        return (await this.teams.create({ ...input, source: sourceFromUrl(sourceUrl) })).id;
      }
      case "update_team": {
        const { kind: _, teamId, ...input } = change;
        return (await this.teams.update(teamId, input)).id;
      }
      case "upload_team_logo": {
        const { teamId, variant, logoUrl } = change;
        return (await this.teams.update(teamId, { [teamLogoField(variant)]: logoUrl })).id;
      }
      case "add_team_alias":
        await this.teamAliases.add(change.teamId, { ...change.alias, sourceUrl });
        return change.teamId;
      case "update_team_alias": {
        const { teamId, aliasId, alias } = change;
        await this.teamAliases.update(teamId, aliasId, { ...alias, sourceUrl });
        return teamId;
      }
      case "merge_players":
        return (await this.merges.mergePlayers(change.keptId, change.duplicateId)).kept.id;
      case "merge_teams":
        return (await this.merges.mergeTeams(change.keptId, change.duplicateId)).kept.id;
      case "create_contract": {
        const { playerId, teamId, startDate, endDate, contractRole } = change;
        const input = { teamId, startDate, endDate, role: contractRole, sourceUrl };
        return (await this.contracts.recordPeriod(playerId, input)).id;
      }
      case "update_contract": {
        const { contractId, playerId, teamId, startDate, endDate, contractRole } = change;
        const input = { teamId, startDate, endDate, role: contractRole, sourceUrl };
        return (await this.contracts.revisePeriod(playerId, contractId, input)).id;
      }
      case "set_tournament_prizes":
        await this.prizes.setDistribution(
          change.tournamentId,
          sourcedPrizes(change.prizes, sourceUrl),
        );
        return change.tournamentId;
      case "update_tournament_prize": {
        const { tournamentId, teamId, patch } = change;
        await this.prizes.updateEntry(tournamentId, teamId, patch, sourceUrl);
        return tournamentId;
      }
      case "award_player": {
        const { tournamentId, teamId, playerId, awardType } = change;
        return (await this.awards.createForTeam(tournamentId, teamId, playerId, awardType)).id;
      }
      case "award_season_player": {
        const { kind: _, seasonId, ...award } = change;
        return (await this.seasons.addAward(seasonId, { ...award, sourceUrl })).id;
      }
      case "set_event_streams":
      case "set_tournament_streams":
      case "set_match_streams": {
        const { owner, streams } = streamChangeFor(change);
        await this.streams.set(owner, streams, sourceFromUrl(sourceUrl));
        return owner.id;
      }
      case "set_match_lineups":
        await this.lineups.set(change.matchId, change.lineups);
        return change.matchId;
      case "set_event_viewership":
        await this.viewerships.set({ kind: "event", id: change.eventId }, change.viewership);
        return change.eventId;
      case "set_match_viewership":
        await this.viewerships.set({ kind: "match", id: change.matchId }, change.viewership);
        return change.matchId;
      case "set_circuit_stage_scale": {
        const { circuitId, tournamentId } = change;
        await this.circuits.setStageScale(
          circuitId,
          tournamentId,
          circuitStageInput(change, sourceUrl),
        );
        return circuitId;
      }
      case "delete_match":
        await this.matches.deleteMatch(change.matchId);
        return change.matchId;
      case "delete_team":
        if (change.mergeIntoTeamId) {
          return (await this.merges.mergeTeams(change.mergeIntoTeamId, change.teamId)).kept.id;
        }
        await this.teams.delete(change.teamId);
        return change.teamId;
      default: {
        const exhaustive: never = change;
        return exhaustive;
      }
    }
  }

  private async requireTeamRemoval(teamId: string, mergeIntoTeamId: string | undefined) {
    if (mergeIntoTeamId === undefined) {
      await this.teams.requireDeletable(teamId);
      return;
    }
    if (mergeIntoTeamId === teamId) {
      throw new InvalidInputError("A team cannot be merged into itself");
    }
  }

  private async requirePlayer(id: string): Promise<void> {
    const player = await this.players.findById(id);
    if (!player) throw new NotFoundError(`Player with id "${id}" not found`);
    if (player.id !== id) {
      throw new InvalidInputError(`Player "${id}" was merged into "${player.id}"; use that id`);
    }
  }

  private async requireReferences(change: RosterChange): Promise<void> {
    for (const id of referencedPlayerIds(change)) await this.requirePlayer(id);
    for (const id of referencedTeamIds(change)) await this.requireTeam(id);
  }

  private async requireContract(playerId: string, contractId: string): Promise<void> {
    const career = await this.contracts.getContractsByPlayer(playerId);
    if (!career.some((contract) => contract.id === contractId)) {
      throw new NotFoundError(`Contract "${contractId}" does not belong to player "${playerId}"`);
    }
  }

  private async requireTeam(id: string): Promise<void> {
    const team = await this.teams.findById(id);
    if (!team) throw new NotFoundError(`Team with id "${id}" not found`);
    if (team.id !== id) {
      throw new InvalidInputError(`Team "${id}" was merged into "${team.id}"; use that id`);
    }
  }
}

function referencedPlayerIds(change: RosterChange): string[] {
  switch (change.kind) {
    case "add_player_to_team":
    case "remove_player_from_team":
    case "update_player":
    case "create_contract":
    case "update_contract":
    case "award_player":
    case "award_season_player":
      return [change.playerId];
    case "merge_players":
      return [change.keptId, change.duplicateId];
    case "set_tournament_prizes":
      return change.prizes.flatMap(({ playerIds }) => playerIds);
    case "update_tournament_prize":
      return change.patch.playerIds ?? [];
    case "set_match_lineups":
      return change.lineups.flatMap(({ playerIds }) => playerIds);
    case "create_player":
    case "create_team":
    case "update_team":
    case "upload_team_logo":
    case "add_team_alias":
    case "update_team_alias":
    case "merge_teams":
    case "set_event_streams":
    case "set_tournament_streams":
    case "set_match_streams":
    case "set_event_viewership":
    case "set_match_viewership":
    case "set_circuit_stage_scale":
    case "delete_match":
    case "delete_team":
      return [];
    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}

function referencedTeamIds(change: RosterChange): string[] {
  switch (change.kind) {
    case "add_player_to_team":
    case "remove_player_from_team":
      return [change.teamId];
    case "update_team":
    case "upload_team_logo":
    case "add_team_alias":
    case "update_team_alias":
    case "create_contract":
    case "award_player":
      return [change.teamId];
    case "update_contract":
      return change.teamId ? [change.teamId] : [];
    case "merge_teams":
      return [change.keptId, change.duplicateId];
    case "set_tournament_prizes":
      return change.prizes.map(({ teamId }) => teamId);
    case "update_tournament_prize":
      return [change.teamId];
    case "set_circuit_stage_scale":
      return [
        ...new Set([
          ...(change.regionTeamIds ?? []),
          ...(change.finishes ?? []).map(({ teamId }) => teamId),
        ]),
      ];
    case "delete_team":
      return change.mergeIntoTeamId ? [change.teamId, change.mergeIntoTeamId] : [change.teamId];
    case "create_player":
    case "update_player":
    case "create_team":
    case "merge_players":
    case "award_season_player":
    case "set_event_streams":
    case "set_tournament_streams":
    case "set_match_streams":
    case "set_match_lineups":
    case "set_event_viewership":
    case "set_match_viewership":
    case "delete_match":
      return [];
    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}

function sourcedPrizes(prizes: ProposedPrizeEntry[], sourceUrl: string): PrizeEntry[] {
  return prizes.map((prize) => ({ ...prize, sourceUrl }));
}

type StreamRosterChange = Extract<
  RosterChange,
  { kind: "set_event_streams" | "set_tournament_streams" | "set_match_streams" }
>;

function streamChangeFor(change: StreamRosterChange): StreamChange {
  switch (change.kind) {
    case "set_event_streams":
      return { owner: { kind: "event", id: change.eventId }, streams: change.streams };
    case "set_tournament_streams":
      return { owner: { kind: "tournament", id: change.tournamentId }, streams: change.streams };
    case "set_match_streams":
      return { owner: { kind: "match", id: change.matchId }, streams: change.streams };
    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}

function streamChangeOf(change: RosterChange): StreamChange | null {
  switch (change.kind) {
    case "set_event_streams":
    case "set_tournament_streams":
    case "set_match_streams":
      return streamChangeFor(change);
    default:
      return null;
  }
}
