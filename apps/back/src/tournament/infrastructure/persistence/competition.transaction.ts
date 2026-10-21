import { EntityManager } from "@mikro-orm/postgresql";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { ConflictError } from "../../../common/domain/errors";
import { Player, Team } from "../../../player/infrastructure/roster-persistence";
import { RosterSyncWriter } from "../../../player/infrastructure/roster-persistence";
import * as Row from "./tournament.entities";
import type * as Model from "../../domain/competition";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  TournamentWriter,
  MatchWriter,
} from "../../application/ports";
import { toTournament, toLeague, toParticipant, toMatch } from "./competition.mapper";
import { CompetitionAwardWriter } from "./player-award.store";
export class CompetitionTournamentWriter implements TournamentWriter {
  private readonly tournaments = new Map<string, Row.Tournament>();
  private readonly participantsStaged = new Map<string, Row.TournamentParticipant>();
  private readonly leagues = new Map<string, Row.League>();
  constructor(private readonly em: EntityManager) {}
  async load(id: string) {
    const row =
      this.tournaments.get(id) ??
      (await this.em.findOne(
        Row.Tournament,
        { id },
        { populate: ["league", "winner.team", "participants.team", "participants.players"] },
      ));
    if (row) this.tournaments.set(row.id, row);
    return row ? toTournament(row) : null;
  }
  async byPandascoreId(id: number) {
    const staged = [...this.tournaments.values()].find((t) => t.pandascoreId === id);
    if (staged) return toTournament(staged);
    const row = await this.em.findOne(
      Row.Tournament,
      { pandascoreId: id },
      { populate: ["league", "winner.team", "participants.team", "participants.players"] },
    );
    if (row) this.tournaments.set(row.id, row);
    return row ? toTournament(row) : null;
  }
  async bySlug(slug: string) {
    const row = await this.em.findOne(
      Row.Tournament,
      { slug },
      { populate: ["league", "winner.team"] },
    );
    return row ? toTournament(row) : null;
  }
  async save(model: Model.Tournament) {
    let row =
      this.tournaments.get(model.id) ?? (await this.em.findOne(Row.Tournament, { id: model.id }));
    if (!row) {
      row = new Row.Tournament();
      row.id = model.id;
    }
    Object.assign(row, {
      pandascoreId: model.pandascoreId,
      source: model.source,
      name: model.name,
      description: model.description,
      slug: model.slug,
      serie: model.serie,
      tier: model.tier,
      beginAt: model.beginAt,
      endAt: model.endAt,
      winnerType: model.winnerType,
      type: model.type,
      country: model.country,
      prizepool: model.prizepool,
      imageUrl: model.imageUrl,
      pickemsEnabled: model.pickemsEnabled,
      hasBracket: model.hasBracket,
    });
    row.league = model.league ? this.em.getReference(Row.League, model.league.id) : null;
    row.winner = model.winner
      ? this.em.getReference(Row.TournamentParticipant, model.winner.id)
      : null;
    this.em.persist(row);
    this.tournaments.set(row.id, row);
  }
  async league(id: string) {
    const row = this.leagues.get(id) ?? (await this.em.findOne(Row.League, { id }));
    return row ? toLeague(row) : null;
  }
  async leagueByPandascoreId(id: number) {
    const row =
      [...this.leagues.values()].find((l) => l.pandascoreId === id) ??
      (await this.em.findOne(Row.League, { pandascoreId: id }));
    return row ? toLeague(row) : null;
  }
  async saveLeague(model: Model.League) {
    let row = this.leagues.get(model.id) ?? (await this.em.findOne(Row.League, { id: model.id }));
    if (!row) {
      row = new Row.League();
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
      Row.TournamentParticipant,
      { tournament: { id } },
      { populate: ["team", "players", "players.team"] },
    );
    const byId = new Map<string, Row.TournamentParticipant>(rows.map((r) => [r.id, r]));
    for (const r of this.participantsStaged.values()) if (r.tournament.id === id) byId.set(r.id, r);
    return [...byId.values()].map(toParticipant);
  }
  async saveParticipant(model: Model.ParticipantSnapshot) {
    let row =
      this.participantsStaged.get(model.id) ??
      (await this.em.findOne(Row.TournamentParticipant, { id: model.id }));
    if (!row) {
      row = new Row.TournamentParticipant();
      row.id = model.id;
    }
    row.tournament = this.em.getReference(Row.Tournament, model.tournamentId);
    row.team = this.em.getReference(Team, model.teamId);
    row.players.set(model.playerIds.map((id) => this.em.getReference(Player, id)));
    this.em.persist(row);
    this.participantsStaged.set(row.id, row);
  }
  async removeParticipant(id: string) {
    const row = await this.em.findOneOrFail(Row.TournamentParticipant, { id });
    this.em.remove(row);
    this.participantsStaged.delete(id);
  }
  async teamsExist(ids: string[]) {
    return (await this.em.count(Team, { id: { $in: ids } })) === ids.length;
  }
  async participantReferences(tournamentId: string, participantId: string) {
    const [tournamentWinner, matchParticipant, matchWinner, results] = await Promise.all([
      this.em.count(Row.Tournament, { id: tournamentId, winner: { id: participantId } }),
      this.em.count(Row.Match, {
        tournament: { id: tournamentId },
        participants: { id: participantId },
      }),
      this.em.count(Row.Match, { tournament: { id: tournamentId }, winner: { id: participantId } }),
      this.em.count(Row.MatchResult, { participant: { id: participantId } }),
    ]);
    return {
      tournamentWinner: tournamentWinner > 0,
      matchParticipant: matchParticipant > 0,
      matchWinner: matchWinner > 0,
      results: results > 0,
    };
  }
}
export class CompetitionMatchWriter implements MatchWriter {
  private readonly staged = new Map<string, Row.Match>();
  constructor(
    private readonly em: EntityManager,
    private readonly tournaments: CompetitionTournamentWriter,
  ) {}
  async load(id: string) {
    const row =
      this.staged.get(id) ??
      (await this.em.findOne(
        Row.Match,
        { id },
        {
          populate: [
            "tournament.league",
            "participants.team",
            "participants.players",
            "winner.team",
            "results.participant",
            "previousMatches.previousMatch",
          ],
        },
      ));
    if (row) this.staged.set(row.id, row);
    return row ? toMatch(row) : null;
  }
  async byPandascoreId(id: number) {
    const staged = [...this.staged.values()].find((m) => m.pandascoreId === id);
    if (staged) return toMatch(staged);
    const row = await this.em.findOne(
      Row.Match,
      { pandascoreId: id },
      {
        populate: [
          "tournament.league",
          "participants.team",
          "participants.players",
          "winner.team",
          "results.participant",
          "previousMatches.previousMatch",
        ],
      },
    );
    if (row) this.staged.set(row.id, row);
    return row ? toMatch(row) : null;
  }
  async tournament(id: string) {
    const t = await this.tournaments.load(id);
    return t
      ? {
          id: t.id,
          name: t.name,
          serie: t.serie,
          beginAt: t.beginAt,
          league: t.league,
          pickemsEnabled: t.pickemsEnabled,
          source: t.source,
          pandascoreId: t.pandascoreId,
        }
      : null;
  }
  participants(id: string) {
    return this.tournaments.participants(id);
  }
  async save(model: Model.Match) {
    let row =
      this.staged.get(model.id) ??
      (await this.em.findOne(
        Row.Match,
        { id: model.id },
        { populate: ["participants", "results", "previousMatches"] },
      ));
    if (!row) {
      row = new Row.Match();
      row.id = model.id;
    }
    Object.assign(row, {
      pandascoreId: model.pandascoreId,
      name: model.name,
      beginAt: model.beginAt,
      endAt: model.endAt,
      status: model.status,
      numberOfGames: model.numberOfGames,
      officialStreams: model.officialStreams,
    });
    row.tournament = this.em.getReference(Row.Tournament, model.tournament.id);
    row.winner = model.winner
      ? this.em.getReference(Row.TournamentParticipant, model.winner.id)
      : null;
    row.participants.set(
      model.participants.map((p) => this.em.getReference(Row.TournamentParticipant, p.id)),
    );
    const existingResults = new Map(row.results.getItems().map((result) => [result.id, result]));
    const existingLinks = new Map(row.previousMatches.getItems().map((link) => [link.id, link]));
    const resultIds = new Set(model.results.map((r) => r.id)),
      linkIds = new Set(model.previousMatches.map((l) => l.id));
    if (row.results.isInitialized())
      for (const result of row.results.getItems())
        if (!resultIds.has(result.id)) this.em.remove(result);
    if (row.previousMatches.isInitialized())
      for (const link of row.previousMatches.getItems())
        if (!linkIds.has(link.id)) this.em.remove(link);
    row.results.set(
      model.results.map((r) => {
        const result = existingResults.get(r.id) ?? new Row.MatchResult();
        result.id = r.id;
        result.match = row;
        result.participant = this.em.getReference(Row.TournamentParticipant, r.participant.id);
        result.score = r.score;
        this.em.persist(result);
        return result;
      }),
    );
    row.previousMatches.set(
      model.previousMatches.map((l) => {
        const link = existingLinks.get(l.id) ?? new Row.BracketLink();
        link.id = l.id;
        link.match = row;
        link.previousMatch = this.em.getReference(Row.Match, l.previousMatch.id);
        link.type = l.type;
        this.em.persist(link);
        return link;
      }),
    );
    this.em.persist(row);
    this.staged.set(row.id, row);
  }
}
export class MikroOrmCompetitionTransaction implements CompetitionTransaction {
  constructor(private readonly em: EntityManager) {}
  async run<T>(work: (scope: CompetitionWriteScope) => Promise<T>): Promise<T> {
    let awardWriter: CompetitionAwardWriter | undefined;
    try {
      return await this.em.transactional(async (em) => {
        const tournaments = new CompetitionTournamentWriter(em);
        awardWriter = new CompetitionAwardWriter(em);
        const result = await work({
          tournaments,
          matches: new CompetitionMatchWriter(em, tournaments),
          rosters: new RosterSyncWriter(em),
          awards: awardWriter,
        });
        await em.flush();
        return result;
      });
    } catch (error) {
      if (
        error instanceof UniqueConstraintViolationException &&
        error.message.includes("player_award")
      )
        throw new ConflictError(
          awardWriter?.conflictMessage ??
            "This tournament already has that award. Remove the current award before assigning another player.",
        );
      throw error;
    }
  }
}
