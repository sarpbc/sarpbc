import type { EntityManager } from "@mikro-orm/postgresql";
import { mapSequentially } from "../../../common/application/sequentially";
import { Player, Team, toPlayer } from "../../../roster/infrastructure/roster-persistence";
import { Tournament as TournamentRow } from "./tournament.entity";
import { TournamentParticipant as TournamentParticipantRow } from "./tournament-participant.entity";
import { League as LeagueRow } from "./league.entity";
import { TournamentEvent as TournamentEventRow } from "./tournament-event.entity";
import { Match as MatchRow } from "./match.entity";
import { MatchResult as MatchResultRow } from "./match-result.entity";
import type { Tournament } from "../../domain/tournament";
import type { League } from "../../domain/league";
import type { ParticipantSnapshot } from "../../domain/tournament-participant";
import type { TournamentWriter } from "../../application/ports";
import { toTournament, toLeague, toParticipant } from "./competition.mapper";
import { TOURNAMENT_POPULATE } from "./tournament-populate";
import { unchangedJson } from "./unchanged-json";

export class CompetitionTournamentWriter implements TournamentWriter {
  private readonly tournaments = new Map<string, TournamentRow>();
  private readonly participantsStaged = new Map<string, TournamentParticipantRow>();
  private readonly leagues = new Map<string, LeagueRow>();
  constructor(private readonly em: EntityManager) {}
  async load(id: string) {
    const row =
      this.tournaments.get(id) ??
      (await this.em.findOne(TournamentRow, { id }, { populate: [...TOURNAMENT_POPULATE] }));

    if (row) {
      this.tournaments.set(row.id, row);
    }

    return row ? toTournament(row) : null;
  }
  async byPandascoreId(id: number) {
    const staged = [...this.tournaments.values()].find((t) => t.pandascoreId === id);

    if (staged) {
      return toTournament(staged);
    }

    const row = await this.em.findOne(
      TournamentRow,
      { pandascoreId: id },
      { populate: [...TOURNAMENT_POPULATE] },
    );

    if (row) {
      this.tournaments.set(row.id, row);
    }

    return row ? toTournament(row) : null;
  }
  async manualCandidates({ from, to }: { from: Date; to: Date }) {
    const rows = await this.em.find(
      TournamentRow,
      { source: "manual", pandascoreId: null, beginAt: { $gte: from, $lte: to } },
      { orderBy: { id: "ASC" } },
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      leagueId: row.league?.id ?? null,
      beginAt: row.beginAt,
      endAt: row.endAt,
    }));
  }
  async save(model: Tournament) {
    let row =
      this.tournaments.get(model.id) ?? (await this.em.findOne(TournamentRow, { id: model.id }));

    if (!row) {
      row = new TournamentRow();
      row.id = model.id;
    }

    Object.assign(row, {
      pandascoreId: model.pandascoreId,
      source: model.source,
      format: model.format,
      name: model.name,
      description: model.description,
      slug: model.slug,
      tier: model.tier,
      beginAt: model.beginAt,
      endAt: model.endAt,
      endAtCorrected: model.endAtCorrected,
      winnerType: model.winnerType,
      type: model.type,
      country: model.country,
      prizepool: model.prizepool,
      imageUrl: model.imageUrl,
      pickemsEnabled: model.pickemsEnabled,
      hasBracket: model.hasBracket,
      streams: unchangedJson(row.streams, model.streams),
    });
    row.event = this.em.getReference(TournamentEventRow, model.event.id);
    row.league = model.league ? this.em.getReference(LeagueRow, model.league.id) : null;
    row.winner = model.winner
      ? this.em.getReference(TournamentParticipantRow, model.winner.id)
      : null;
    this.em.persist(row);
    this.tournaments.set(row.id, row);
  }
  async league(id: string) {
    const row = this.leagues.get(id) ?? (await this.em.findOne(LeagueRow, { id }));

    return row ? toLeague(row) : null;
  }
  async leagueByPandascoreId(id: number) {
    const row =
      [...this.leagues.values()].find((l) => l.pandascoreId === id) ??
      (await this.em.findOne(LeagueRow, { pandascoreId: id }));

    return row ? toLeague(row) : null;
  }
  async saveLeague(model: League) {
    let row = this.leagues.get(model.id) ?? (await this.em.findOne(LeagueRow, { id: model.id }));

    if (!row) {
      row = new LeagueRow();
      row.id = model.id;
    }

    Object.assign(row, {
      pandascoreId: model.pandascoreId,
      name: model.name,
      slug: model.slug,
      url: model.url,
      imageUrl: model.imageUrl,
      modifiedAt: model.modifiedAt,
    });
    this.em.persist(row);
    this.leagues.set(row.id, row);
  }
  async participants(id: string) {
    const rows = await this.em.find(
      TournamentParticipantRow,
      { tournament: { id } },
      { populate: ["team", "players", "players.team"] },
    );

    const byId = new Map<string, TournamentParticipantRow>(rows.map((r) => [r.id, r]));

    for (const r of this.participantsStaged.values()) {
      if (r.tournament.id === id) {
        byId.set(r.id, r);
      }
    }

    return [...byId.values()].flatMap((row) => toParticipant(row) ?? []);
  }
  async saveParticipant(model: ParticipantSnapshot) {
    let row =
      this.participantsStaged.get(model.id) ??
      (await this.em.findOne(TournamentParticipantRow, { id: model.id }));

    if (!row) {
      row = new TournamentParticipantRow();
      row.id = model.id;
    }

    row.tournament = this.em.getReference(TournamentRow, model.tournamentId);
    row.team =
      model.teamId !== null && model.teamId !== ""
        ? this.em.getReference(Team, model.teamId)
        : null;
    row.players.set(model.playerIds.map((id) => this.em.getReference(Player, id)));
    row.rosterSourceUrl = model.rosterSourceUrl;
    this.em.persist(row);
    this.participantsStaged.set(row.id, row);
  }
  async setPlacements(placements: ReadonlyMap<string, number | null>) {
    await mapSequentially([...placements], async ([id, placement]) => {
      const row =
        this.participantsStaged.get(id) ??
        (await this.em.findOne(TournamentParticipantRow, { id }));

      if (!row || row.placement === placement) {
        return;
      }

      row.placement = placement;
      this.em.persist(row);
    });
  }
  async removeParticipant(id: string) {
    const row = await this.em.findOneOrFail(TournamentParticipantRow, { id });
    this.em.remove(row);
    this.participantsStaged.delete(id);
  }
  async teamsExist(ids: string[]) {
    return (await this.em.count(Team, { id: { $in: ids } })) === ids.length;
  }
  async playersExist(ids: string[]) {
    return (await this.em.count(Player, { id: { $in: ids } })) === ids.length;
  }
  async teamPlayers(teamId: string) {
    const rows = await this.em.find(
      Player,
      { team: { id: teamId }, mergedInto: null },
      { populate: ["team"], orderBy: { name: "asc" } },
    );

    return rows.map(toPlayer);
  }
  async participantReferences(tournamentId: string, participantId: string) {
    const [tournamentWinner, matchParticipant, matchWinner, results] = await Promise.all([
      this.em.count(TournamentRow, { id: tournamentId, winner: { id: participantId } }),
      this.em.count(MatchRow, {
        tournament: { id: tournamentId },
        participants: { id: participantId },
      }),
      this.em.count(MatchRow, { tournament: { id: tournamentId }, winner: { id: participantId } }),
      this.em.count(MatchResultRow, { participant: { id: participantId } }),
    ]);

    return {
      tournamentWinner: tournamentWinner > 0,
      matchParticipant: matchParticipant > 0,
      matchWinner: matchWinner > 0,
      results: results > 0,
    };
  }
}
