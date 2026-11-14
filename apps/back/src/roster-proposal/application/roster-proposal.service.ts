import type { RosterChange, RosterProposalStatus, TeamLogoVariant } from "@sarpbc/types";
import { isAcceptedDataSourceUrl, requiredPermission } from "@sarpbc/utils";
import { mapSequentially } from "../../common/application/sequentially";
import {
  REFUSED_DATA_SOURCE_MESSAGE,
  isRedistributable,
  sourceFromUrl,
} from "../../common/domain/data-source";
import { ForbiddenError } from "../../common/domain/errors/forbidden-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
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
import { assertPrizeDistribution } from "../../tournament/domain/prize-distribution";
import type { RosterProposalTransaction, RosterProposalStore } from "./ports";
import {
  circuitStageInput,
  sourcedPrizes,
  streamChangeFor,
  streamChangeOf,
} from "./roster-change-inputs";
import { referencedPlayerIds, referencedTeamIds } from "./roster-change-references";

type Kind = RosterChange["kind"];

type ChangeMap = { [K in Kind]: Extract<RosterChange, { kind: K }> };

type ApplyHandlers = {
  [K in Kind]: (change: ChangeMap[K], sourceUrl: string) => Promise<string>;
};

const applyChange = async <K extends Kind>(
  handlers: ApplyHandlers,
  kind: K,
  change: ChangeMap[K],
  sourceUrl: string,
): Promise<string> => await handlers[kind](change, sourceUrl);

const idOf = async (created: Promise<{ id: string }>): Promise<string> => {
  const { id } = await created;

  return id;
};

const keptIdOf = async (merged: Promise<{ kept: { id: string } }>): Promise<string> => {
  const { kept } = await merged;

  return kept.id;
};

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
    if (sourceUrl !== "" && !isAcceptedDataSourceUrl(sourceUrl)) {
      throw new InvalidInputError(REFUSED_DATA_SOURCE_MESSAGE);
    }

    await this.requireReferences(change);

    if (change.kind === "update_contract") {
      await this.requireContract(change.playerId, change.contractId);
    }

    if (change.kind === "set_tournament_prizes") {
      assertPrizeDistribution(sourcedPrizes(change.prizes, sourceUrl));
      await this.prizes.requireProposableTournament(change.tournamentId);
    }

    if (change.kind === "update_tournament_prize") {
      const { tournamentId, teamId, patch } = change;
      await this.prizes.requireProposablePrize(tournamentId, teamId, patch);
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
      if (!isRedistributable(sourceFromUrl(sourceUrl))) {
        throw new InvalidInputError("Lineups sourced from start.gg cannot be proposed");
      }

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
    return await this.transaction.run(async (proposals) => {
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
    return await this.transaction.run(async (proposals) => {
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

    if (!proposal) {
      throw new NotFoundError(`Roster proposal "${id}" not found`);
    }

    const permission = requiredPermission(proposal.change);

    if (!(await this.staff.hasAnyPermission(reviewerId, [permission]))) {
      throw new ForbiddenError(`Reviewing this proposal requires ${permission}`);
    }

    return proposal;
  }

  private async apply(change: RosterChange, sourceUrl: string): Promise<string> {
    return await applyChange(this.applyHandlers(), change.kind, change, sourceUrl);
  }

  private applyHandlers(): ApplyHandlers {
    return {
      add_player_to_team: async ({ playerId, teamId, effectiveDate, contractRole }, sourceUrl) => {
        await this.players.joinTeam(playerId, {
          teamId,
          effectiveDate,
          sourceUrl,
          role: contractRole,
        });

        return playerId;
      },
      remove_player_from_team: async ({ playerId, teamId, effectiveDate, status }, sourceUrl) => {
        await this.players.leaveTeam(playerId, { teamId, effectiveDate, sourceUrl, status });

        return playerId;
      },
      create_player: async (change, sourceUrl) => {
        const { kind: _, ...input } = change;

        return await idOf(this.players.create({ ...input, source: sourceFromUrl(sourceUrl) }));
      },
      update_player: async (change) => {
        const { kind: _, playerId, ...input } = change;

        return await idOf(this.players.update(playerId, input));
      },
      create_team: async (change, sourceUrl) => {
        const { kind: _, ...input } = change;

        return await idOf(this.teams.create({ ...input, source: sourceFromUrl(sourceUrl) }));
      },
      update_team: async (change) => {
        const { kind: _, teamId, ...input } = change;

        return await idOf(this.teams.update(teamId, input));
      },
      upload_team_logo: async ({ teamId, variant, logoUrl }) =>
        await idOf(this.teams.update(teamId, { [teamLogoField(variant)]: logoUrl })),
      add_team_alias: async (change, sourceUrl) => {
        await this.teamAliases.add(change.teamId, { ...change.alias, sourceUrl });

        return change.teamId;
      },
      update_team_alias: async ({ teamId, aliasId, alias }, sourceUrl) => {
        await this.teamAliases.update(teamId, aliasId, { ...alias, sourceUrl });

        return teamId;
      },
      merge_players: async (change) =>
        await keptIdOf(this.merges.mergePlayers(change.keptId, change.duplicateId)),
      merge_teams: async (change) =>
        await keptIdOf(this.merges.mergeTeams(change.keptId, change.duplicateId)),
      create_contract: async ({ playerId, teamId, startDate, endDate, contractRole }, sourceUrl) =>
        await idOf(
          this.contracts.recordPeriod(playerId, {
            teamId,
            startDate,
            endDate,
            role: contractRole,
            sourceUrl,
          }),
        ),
      update_contract: async (
        { contractId, playerId, teamId, startDate, endDate, contractRole },
        sourceUrl,
      ) =>
        await idOf(
          this.contracts.revisePeriod(playerId, contractId, {
            teamId,
            startDate,
            endDate,
            role: contractRole,
            sourceUrl,
          }),
        ),
      set_tournament_prizes: async (change, sourceUrl) => {
        await this.prizes.setDistribution(
          change.tournamentId,
          sourcedPrizes(change.prizes, sourceUrl),
        );

        return change.tournamentId;
      },
      update_tournament_prize: async ({ tournamentId, teamId, patch }, sourceUrl) => {
        await this.prizes.updateEntry(tournamentId, teamId, patch, sourceUrl);

        return tournamentId;
      },
      award_player: async ({ tournamentId, teamId, playerId, awardType }) =>
        await idOf(this.awards.createForTeam(tournamentId, teamId, playerId, awardType)),
      award_season_player: async (change, sourceUrl) => {
        const { kind: _, seasonId, ...award } = change;

        return await idOf(this.seasons.addAward(seasonId, { ...award, sourceUrl }));
      },
      set_event_streams: async (change, sourceUrl) => await this.setStreams(change, sourceUrl),
      set_tournament_streams: async (change, sourceUrl) => await this.setStreams(change, sourceUrl),
      set_match_streams: async (change, sourceUrl) => await this.setStreams(change, sourceUrl),
      set_match_lineups: async (change) => {
        await this.lineups.set(change.matchId, change.lineups);

        return change.matchId;
      },
      set_event_viewership: async (change) => {
        await this.viewerships.set({ kind: "event", id: change.eventId }, change.viewership);

        return change.eventId;
      },
      set_match_viewership: async (change) => {
        await this.viewerships.set({ kind: "match", id: change.matchId }, change.viewership);

        return change.matchId;
      },
      set_circuit_stage_scale: async (change, sourceUrl) => {
        const { circuitId, tournamentId } = change;
        await this.circuits.setStageScale(
          circuitId,
          tournamentId,
          circuitStageInput(change, sourceUrl),
        );

        return circuitId;
      },
      delete_match: async (change) => {
        await this.matches.deleteMatch(change.matchId);

        return change.matchId;
      },
      delete_team: async (change) => {
        if (change.mergeIntoTeamId !== undefined && change.mergeIntoTeamId !== "") {
          return await keptIdOf(this.merges.mergeTeams(change.mergeIntoTeamId, change.teamId));
        }

        await this.teams.delete(change.teamId);

        return change.teamId;
      },
    };
  }

  private async setStreams(
    change: Parameters<typeof streamChangeFor>[0],
    sourceUrl: string,
  ): Promise<string> {
    const { owner, streams } = streamChangeFor(change);
    await this.streams.set(owner, streams, sourceFromUrl(sourceUrl));

    return owner.id;
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

    if (!player) {
      throw new NotFoundError(`Player with id "${id}" not found`);
    }

    if (player.id !== id) {
      throw new InvalidInputError(`Player "${id}" was merged into "${player.id}"; use that id`);
    }
  }

  private async requireReferences(change: RosterChange): Promise<void> {
    await mapSequentially(referencedPlayerIds(change), async (id) => {
      await this.requirePlayer(id);
    });
    await mapSequentially(referencedTeamIds(change), async (id) => {
      await this.requireTeam(id);
    });
  }

  private async requireContract(playerId: string, contractId: string): Promise<void> {
    const career = await this.contracts.getContractsByPlayer(playerId);

    if (!career.some((contract) => contract.id === contractId)) {
      throw new NotFoundError(`Contract "${contractId}" does not belong to player "${playerId}"`);
    }
  }

  private async requireTeam(id: string): Promise<void> {
    const team = await this.teams.findById(id);

    if (!team) {
      throw new NotFoundError(`Team with id "${id}" not found`);
    }

    if (team.id !== id) {
      throw new InvalidInputError(`Team "${id}" was merged into "${team.id}"; use that id`);
    }
  }
}
