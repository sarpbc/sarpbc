import { sourceFromUrl } from "../../common/domain/data-source";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { PlayerService } from "../../player/application/player.service";
import type { RosterMergeService } from "../../player/application/roster-merge.service";
import type { TeamService } from "../../team/application/team.service";
import {
  RosterProposal,
  requiredPermission,
  type RosterChange,
  type RosterProposalStatus,
} from "../domain/roster-proposal";
import type { UserService } from "../../user/application/user.service";
import type { RosterProposalTransaction, RosterProposalStore } from "./ports";

export interface RosterProposalList {
  proposals: RosterProposal[];
  /** Player, team and proposer names keyed by id. */
  names: Record<string, string>;
}

type Players = Pick<PlayerService, "findById" | "create" | "update" | "joinTeam" | "leaveTeam">;
type Teams = Pick<TeamService, "findById" | "create" | "update">;
type Merges = Pick<RosterMergeService, "mergePlayers" | "mergeTeams">;
type Staff = Pick<UserService, "hasAnyPermission" | "findById">;

const LIST_LIMIT = 100;

export class RosterProposalService {
  constructor(
    private readonly store: RosterProposalStore,
    private readonly transaction: RosterProposalTransaction,
    private readonly players: Players,
    private readonly teams: Teams,
    private readonly merges: Merges,
    private readonly staff: Staff,
  ) {}

  async propose(
    change: RosterChange,
    sourceUrl: string,
    proposedById: string,
  ): Promise<RosterProposal> {
    for (const id of referencedPlayerIds(change)) await this.requirePlayer(id);
    for (const id of referencedTeamIds(change)) await this.requireTeam(id);
    const proposal = Object.assign(new RosterProposal(), { change, sourceUrl, proposedById });
    await this.store.save(proposal);
    return proposal;
  }

  async list(status: RosterProposalStatus): Promise<RosterProposalList> {
    const proposals = await this.store.list(status, LIST_LIMIT);
    const names: Record<string, string> = {};
    for (const { change, proposedById } of proposals) {
      names[proposedById] ??= (await this.staff.findById(proposedById))?.userName ?? proposedById;
      for (const id of referencedPlayerIds(change))
        names[id] ??= (await this.players.findById(id))?.name ?? id;
      for (const id of referencedTeamIds(change))
        names[id] ??= (await this.teams.findById(id))?.name ?? id;
    }
    return { proposals, names };
  }

  /** Applies the change and records the approval atomically; a failed change stays pending. */
  async approve(id: string, reviewerId: string): Promise<RosterProposal> {
    return this.transaction.run(async (proposals) => {
      const proposal = await this.reviewable(proposals, id, reviewerId);
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
      return [change.playerId];
    case "merge_players":
      return [change.keptId, change.duplicateId];
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
      return [change.teamId];
    case "merge_teams":
      return [change.keptId, change.duplicateId];
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
