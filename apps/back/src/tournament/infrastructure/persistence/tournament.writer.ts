import { EntityManager } from "@mikro-orm/postgresql";
import { mapSequentially } from "../../../common/application/sequentially";
import { Player, Team, toPlayer } from "../../../roster/infrastructure/roster-persistence";
import { Tournament as TournamentRow } from "./tournament.entity";
import { TournamentParticipant as TournamentParticipantRow } from "./tournament-participant.entity";
import { League as LeagueRow } from "./league.entity";
import { TournamentEvent as TournamentEventRow } from "./tournament-event.entity";
import { Match as MatchRow } from "./match.entity";
import { MatchResult as MatchResultRow } from "./match-result.entity";
import { PlayerAward as PlayerAwardRow } from "./player-award.entities";
import { TournamentPrize as TournamentPrizeRow } from "./tournament-prize.entities";
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
      { beginAt: { $gte: from, $lte: to }, pandascoreId: null, source: "manual" },
      { orderBy: { id: "ASC" } },
    );

    return rows.map((row) => ({
      beginAt: row.beginAt,
      endAt: row.endAt,
      id: row.id,
      leagueId: row.league?.id ?? null,
      name: row.name,
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
      beginAt: model.beginAt,
      country: model.country,
      description: model.description,
      endAt: model.endAt,
      endAtCorrected: model.endAtCorrected,
      format: model.format,
      hasBracket: model.hasBracket,
      imageUrl: model.imageUrl,
      name: model.name,
      pandascoreId: model.pandascoreId,
      pickemsEnabled: model.pickemsEnabled,
      prizepool: model.prizepool,
      slug: model.slug,
      source: model.source,
      streams: unchangedJson(row.streams, model.streams),
      tier: model.tier,
      type: model.type,
      winnerType: model.winnerType,
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
      imageUrl: model.imageUrl,
      modifiedAt: model.modifiedAt,
      name: model.name,
      pandascoreId: model.pandascoreId,
      slug: model.slug,
      url: model.url,
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
  async remove(id: string) {
    await this.em.nativeDelete(PlayerAwardRow, { tournament: id });
    await this.em.nativeDelete(TournamentPrizeRow, { tournament: id });
    await this.em.nativeDelete(TournamentParticipantRow, { tournament: id });
    await this.em.nativeDelete(TournamentRow, { id });
    this.tournaments.delete(id);
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
      { mergedInto: null, team: { id: teamId } },
      { orderBy: { name: "asc" }, populate: ["team"] },
    );

    return rows.map(toPlayer);
  }
  async participantReferences(tournamentId: string, participantId: string) {
    const [tournamentWinner, matchParticipant, matchWinner, results] = await Promise.all([
      this.em.count(TournamentRow, { id: tournamentId, winner: { id: participantId } }),
      this.em.count(MatchRow, {
        participants: { id: participantId },
        tournament: { id: tournamentId },
      }),
      this.em.count(MatchRow, { tournament: { id: tournamentId }, winner: { id: participantId } }),
      this.em.count(MatchResultRow, { participant: { id: participantId } }),
    ]);

    return {
      matchParticipant: matchParticipant > 0,
      matchWinner: matchWinner > 0,
      results: results > 0,
      tournamentWinner: tournamentWinner > 0,
    };
  }
}
