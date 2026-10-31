import { sourceFromUrl } from "../../common/domain/data-source";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { ContractService } from "../../roster/application/contract.service";
import type { PlayerService } from "../../roster/application/player.service";
import type { RosterMergeService } from "../../roster/application/roster-merge.service";
import type { TeamService } from "../../roster/application/team.service";
import {
  RosterProposal,
  requiredPermission,
  type RosterChange,
  type RosterProposalStatus,
} from "../domain/roster-proposal";
import type { UserService } from "../../user/application/user.service";
import type { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import { assertPrizeDistribution } from "../../tournament/domain/prize-distribution";
import type { RosterProposalTransaction, RosterProposalStore } from "./ports";

export interface RosterProposalList {
  proposals: RosterProposal[];
  names: Record<string, string>;
}

type Players = Pick<PlayerService, "findById" | "create" | "update" | "joinTeam" | "leaveTeam">;
type Teams = Pick<TeamService, "findById" | "create" | "update">;
type Contracts = Pick<ContractService, "getContractsByPlayer" | "recordPeriod" | "revisePeriod">;
type Merges = Pick<RosterMergeService, "mergePlayers" | "mergeTeams">;
type Staff = Pick<UserService, "hasAnyPermission">;
type Prizes = Pick<TournamentPrizeService, "findByTournamentId" | "setDistribution">;

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
      assertPrizeDistribution(change.prizes);
      await this.prizes.findByTournamentId(change.tournamentId);
    }
    const proposal = Object.assign(new RosterProposal(), { change, sourceUrl, proposedById });
    await this.store.save(proposal);
    return proposal;
  }

  async list(status: RosterProposalStatus): Promise<RosterProposalList> {
    const proposals = await this.store.list(status, LIST_LIMIT);
    const names = await this.store.names({
      players: [...new Set(proposals.flatMap(({ change }) => referencedPlayerIds(change)))],
      teams: [...new Set(proposals.flatMap(({ change }) => referencedTeamIds(change)))],
      users: [...new Set(proposals.map(({ proposedById }) => proposedById))],
      tournaments: [
        ...new Set(
          proposals.flatMap(({ change }) =>
            change.kind === "set_tournament_prizes" ? [change.tournamentId] : [],
          ),
        ),
      ],
    });
    return { proposals, names };
  }

  /** Applies the change and records the approval atomically; a failed change stays pending. */
  async approve(id: string, reviewerId: string): Promise<RosterProposal> {
    return this.transaction.run(async (proposals) => {
      const proposal = await this.reviewable(proposals, id, reviewerId);
      // A merge approved since the proposal would leave the change on a redirect record.
      await this.requireReferences(proposal.change);
      proposal.approve(reviewerId, new Date());
      proposal.entityId = await this.apply(proposal.change, proposal.sourceUrl);
      await proposals.save(proposal);
      return proposal;
    });
  }

  async reject(id: string, reviewerId: string): Promise<RosterProposal> {
    return this.transaction.run(async (proposals) => {
      const proposal = await this.reviewable(proposals, id, reviewerId);
      proposal.reject(reviewerId, new Date());
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
    const permission = requiredPermission(proposal.change.kind);
    if (!(await this.staff.hasAnyPermission(reviewerId, [permission]))) {
      throw new ForbiddenError(`Reviewing this proposal requires ${permission}`);
    }
    return proposal;
  }

  private async apply(change: RosterChange, sourceUrl: string): Promise<string> {
    switch (change.kind) {
      case "add_player_to_team": {
        const { playerId, teamId, effectiveDate } = change;
        await this.players.joinTeam(playerId, { teamId, effectiveDate, sourceUrl });
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
        await this.prizes.setDistribution(change.tournamentId, change.prizes);
        return change.tournamentId;
      default: {
        const exhaustive: never = change;
        return exhaustive;
      }
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
      return [change.playerId];
    case "merge_players":
      return [change.keptId, change.duplicateId];
    case "set_tournament_prizes":
      return change.prizes.flatMap(({ playerIds }) => playerIds);
    case "create_player":
    case "create_team":
    case "update_team":
    case "merge_teams":
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
    case "create_contract":
      return [change.teamId];
    case "update_contract":
      return change.teamId ? [change.teamId] : [];
    case "merge_teams":
      return [change.keptId, change.duplicateId];
    case "set_tournament_prizes":
      return change.prizes.map(({ teamId }) => teamId);
    case "create_player":
    case "update_player":
    case "create_team":
    case "merge_players":
      return [];
    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}
