import { isDeepStrictEqual } from "node:util";
import { EntityManager } from "@mikro-orm/postgresql";
import { LockMode, type FilterQuery } from "@mikro-orm/core";
import { z } from "zod";
import { Player, Team, toPlayer } from "../../../roster/infrastructure/roster-persistence";
import { RosterSyncWriter } from "../../../roster/infrastructure/roster-persistence";
import * as Row from "./tournament.entities";
import type * as Model from "../../domain/competition";
import type { TournamentEvent } from "../../domain/tournament-event";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  EventWriter,
  TournamentWriter,
  MatchWriter,
} from "../../application/ports";
import {
  MATCH_WRITE_POPULATE,
  toTournament,
  toTournamentEvent,
  toLeague,
  toParticipant,
  toMatch,
} from "./competition.mapper";
import { TOURNAMENT_POPULATE } from "./tournament-populate";
import { CompetitionAwardWriter } from "./player-award.store";
import { CompetitionPrizeWriter } from "./tournament-prize.store";
export class CompetitionTournamentWriter implements TournamentWriter {
  private readonly tournaments = new Map<string, Row.Tournament>();
  private readonly participantsStaged = new Map<string, Row.TournamentParticipant>();
  private readonly leagues = new Map<string, Row.League>();
  constructor(private readonly em: EntityManager) {}
  async load(id: string) {
    const row =
      this.tournaments.get(id) ??
      (await this.em.findOne(Row.Tournament, { id }, { populate: [...TOURNAMENT_POPULATE] }));
    if (row) this.tournaments.set(row.id, row);
    return row ? toTournament(row) : null;
  }
  async byPandascoreId(id: number) {
    const staged = [...this.tournaments.values()].find((t) => t.pandascoreId === id);
    if (staged) return toTournament(staged);
    const row = await this.em.findOne(
      Row.Tournament,
      { pandascoreId: id },
      { populate: [...TOURNAMENT_POPULATE] },
    );
    if (row) this.tournaments.set(row.id, row);
    return row ? toTournament(row) : null;
  }
  async manualCandidates({ from, to }: { from: Date; to: Date }) {
    const rows = await this.em.find(
      Row.Tournament,
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
    row.event = this.em.getReference(Row.TournamentEvent, model.event.id);
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
    return [...byId.values()].flatMap((row) => toParticipant(row) ?? []);
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
    row.team = model.teamId ? this.em.getReference(Team, model.teamId) : null;
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
const matchReferenceCounts = z.object({
  picks: z.coerce.number().int().nonnegative(),
  comments: z.coerce.number().int().nonnegative(),
  nextMatches: z.coerce.number().int().nonnegative(),
});
export class CompetitionMatchWriter implements MatchWriter {
  private readonly staged = new Map<string, Row.Match>();
  constructor(
    private readonly em: EntityManager,
    private readonly tournaments: CompetitionTournamentWriter,
  ) {}
  async load(id: string) {
    let row = this.staged.get(id) ?? null;
    if (!row) {
      row = await this.em.findOne(
        Row.Match,
        { id },
        { refresh: true, lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (row) await this.em.populate(row, [...MATCH_WRITE_POPULATE], { refresh: true });
    }
    if (row) this.staged.set(row.id, row);
    return row ? toMatch(row) : null;
  }
  async byPandascoreId(id: number) {
    const staged = [...this.staged.values()].find((m) => m.pandascoreId === id);
    if (staged) return toMatch(staged);
    const row = await this.em.findOne(
      Row.Match,
      { pandascoreId: id },
      { populate: [...MATCH_WRITE_POPULATE] },
    );
    if (row) this.staged.set(row.id, row);
    return row ? toMatch(row) : null;
  }
  async timings(tournamentId: string) {
    const rows = await this.em.find(Row.Match, { tournament: tournamentId });
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const row of this.staged.values())
      if (row.tournament.id === tournamentId) byId.set(row.id, row);
    return [...byId.values()].map(({ status, beginAt, endAt }) => ({ status, beginAt, endAt }));
  }
  tournament(id: string) {
    return this.tournaments.load(id);
  }
  async references(id: string) {
    const counts: unknown = await this.em.execute(
      `select
        (select count(*) from "pickem_choice" where "match_id" = ?) as "picks",
        (select count(*) from "reply" where "match_id" = ?) as "comments",
        (select count(*) from "bracket_link" where "previous_match_id" = ?) as "nextMatches"`,
      [id, id, id],
    );
    const [row] = z.tuple([matchReferenceCounts]).parse(counts);
    return row;
  }
  async remove(id: string) {
    await this.em.nativeDelete(Row.MatchResult, { match: id });
    await this.em.nativeDelete(Row.BracketLink, { match: id });
    await this.em.nativeDelete(Row.Match, { id });
    this.staged.delete(id);
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
      source: model.source,
      name: model.name,
      beginAt: model.beginAt,
      endAt: model.endAt,
      status: model.status,
      numberOfGames: model.numberOfGames,
      // jsonb reorders keys, so the ORM would see an equal value as a change and bump updatedAt.
      officialStreams: unchangedJson(row.officialStreams, model.officialStreams),
      streams: unchangedJson(row.streams, model.streams),
      vods: model.vods,
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
export class CompetitionEventWriter implements EventWriter {
  constructor(private readonly em: EntityManager) {}
  private async find(where: FilterQuery<Row.TournamentEvent>) {
    const row = await this.em.findOne(Row.TournamentEvent, where, {
      populate: ["league"],
      orderBy: { id: "ASC" },
    });
    return row ? toTournamentEvent(row) : null;
  }
  load(id: string) {
    return this.find({ id });
  }
  bySerieId(id: number) {
    return this.find({ pandascoreSerieId: id });
  }
  unclaimedByName(leagueId: string | null, name: string) {
    return this.find({
      pandascoreSerieId: null,
      league: leagueId,
      name,
      stages: { $none: { source: { $ne: "pandascore" } } },
    });
  }
  async slugTaken(slug: string, exceptEventId: string | null) {
    const where: FilterQuery<Row.TournamentEvent> = exceptEventId
      ? { slug, id: { $ne: exceptEventId } }
      : { slug };
    return (await this.em.count(Row.TournamentEvent, where)) > 0;
  }
  async stageSlugTaken(eventId: string, slug: string, exceptTournamentId: string) {
    return (
      (await this.em.count(Row.Tournament, {
        event: eventId,
        slug,
        id: { $ne: exceptTournamentId },
      })) > 0
    );
  }
  async stages(eventId: string) {
    const rows = await this.em.find(
      Row.Tournament,
      { event: eventId },
      { orderBy: { beginAt: "ASC", id: "ASC" } },
    );
    return rows.map(({ id, name, source }) => ({ id, name, source }));
  }
  async save(model: TournamentEvent) {
    const row =
      (await this.em.findOne(Row.TournamentEvent, { id: model.id })) ??
      Object.assign(new Row.TournamentEvent(), { id: model.id });
    Object.assign(row, {
      pandascoreSerieId: model.pandascoreSerieId,
      slug: model.slug,
      name: model.name,
      streams: unchangedJson(row.streams, model.streams),
    });
    row.league = model.league ? this.em.getReference(Row.League, model.league.id) : null;
    this.em.persist(row);
  }
  async remove(id: string) {
    const row = await this.em.findOne(Row.TournamentEvent, { id });
    if (row) this.em.remove(row);
  }
}
function unchangedJson<T>(current: T, next: T): T {
  return isDeepStrictEqual(current, next) ? current : next;
}
function lazyWriteScope(em: EntityManager): CompetitionWriteScope {
  let tournaments: CompetitionTournamentWriter | undefined;
  let events: CompetitionEventWriter | undefined;
  let matches: CompetitionMatchWriter | undefined;
  let rosters: RosterSyncWriter | undefined;
  let awards: CompetitionAwardWriter | undefined;
  let prizes: CompetitionPrizeWriter | undefined;
  const tournamentWriter = () => (tournaments ??= new CompetitionTournamentWriter(em));
  return {
    get tournaments() {
      return tournamentWriter();
    },
    get events() {
      return (events ??= new CompetitionEventWriter(em));
    },
    get matches() {
      return (matches ??= new CompetitionMatchWriter(em, tournamentWriter()));
    },
    get rosters() {
      return (rosters ??= new RosterSyncWriter(em));
    },
    get awards() {
      return (awards ??= new CompetitionAwardWriter(em));
    },
    get prizes() {
      return (prizes ??= new CompetitionPrizeWriter(em));
    },
  };
}
export class MikroOrmCompetitionTransaction implements CompetitionTransaction {
  constructor(private readonly em: EntityManager) {}
  run<T>(work: (scope: CompetitionWriteScope) => Promise<T>): Promise<T> {
    return this.em.transactional(async (em) => {
      const result = await work(lazyWriteScope(em));
      await em.flush();
      return result;
    });
  }
}
