import { EntityManager } from "@mikro-orm/postgresql";
import { LockMode } from "@mikro-orm/core";
import { z } from "zod";
import { Tournament as TournamentRow } from "./tournament.entity";
import { TournamentParticipant as TournamentParticipantRow } from "./tournament-participant.entity";
import { Match as MatchRow } from "./match.entity";
import { MatchResult as MatchResultRow } from "./match-result.entity";
import { BracketLink as BracketLinkRow } from "./bracket-link.entity";
import type { Match } from "../../domain/match";
import type { StageBracket } from "../../domain/bracket";
import type { MatchWriter } from "../../application/ports";
import { MATCH_WRITE_POPULATE, toMatch } from "./competition.mapper";
import { unchangedJson } from "./unchanged-json";
import { CompetitionTournamentWriter } from "./tournament.writer";

const matchReferenceCounts = z.object({
  picks: z.coerce.number().int().nonnegative(),
  comments: z.coerce.number().int().nonnegative(),
  nextMatches: z.coerce.number().int().nonnegative(),
});

const stageBracketRows = z.array(z.object({ has_bracket: z.boolean() }));

const stageMatchRows = z.array(
  z.object({
    id: z.string(),
    previous_match_id: z.string().nullable(),
    type: z.enum(["winner", "loser"]).nullable(),
  }),
);

export class CompetitionMatchWriter implements MatchWriter {
  private readonly staged = new Map<string, MatchRow>();
  constructor(
    private readonly em: EntityManager,
    private readonly tournaments: CompetitionTournamentWriter,
  ) {}
  async load(id: string) {
    let row = this.staged.get(id) ?? null;

    if (!row) {
      row = await this.em.findOne(
        MatchRow,
        { id },
        { refresh: true, lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      if (row) {
        await this.em.populate(row, [...MATCH_WRITE_POPULATE], { refresh: true });
      }
    }

    if (row) {
      this.staged.set(row.id, row);
    }

    return row ? toMatch(row) : null;
  }
  async byPandascoreId(id: number) {
    const staged = [...this.staged.values()].find((m) => m.pandascoreId === id);

    if (staged) {
      return toMatch(staged);
    }

    const row = await this.em.findOne(
      MatchRow,
      { pandascoreId: id },
      { populate: [...MATCH_WRITE_POPULATE] },
    );

    if (row) {
      this.staged.set(row.id, row);
    }

    return row ? toMatch(row) : null;
  }
  async timings(tournamentId: string) {
    const rows = await this.em.findAll(MatchRow, { where: { tournament: tournamentId } });
    const byId = new Map(rows.map((row) => [row.id, row]));

    for (const row of this.staged.values()) {
      if (row.tournament.id === tournamentId) {
        byId.set(row.id, row);
      }
    }

    return [...byId.values()].map(({ status, beginAt, endAt }) => ({ status, beginAt, endAt }));
  }
  async tournament(id: string) {
    return await this.tournaments.load(id);
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
    await this.em.nativeDelete(MatchResultRow, { match: id });
    await this.em.nativeDelete(BracketLinkRow, { match: id });
    await this.em.nativeDelete(MatchRow, { id });
    this.staged.delete(id);
  }
  async participants(id: string) {
    return await this.tournaments.participants(id);
  }
  async bracket(tournamentId: string) {
    const [stage] = stageBracketRows.parse(
      await this.em.execute(`select "has_bracket" from "tournament" where "id" = ? for update`, [
        tournamentId,
      ]),
    );

    const matches = stageMatchRows.parse(
      await this.em.execute(
        `select "m"."id", "l"."previous_match_id", "l"."type"
        from "match" "m" left join "bracket_link" "l" on "l"."match_id" = "m"."id"
        where "m"."tournament_id" = ? order by "m"."id"`,
        [tournamentId],
      ),
    );

    const byId = new Map<string, StageBracket["matches"][number]>();

    for (const row of matches) {
      const match = byId.get(row.id) ?? { id: row.id, previousMatches: [] };

      if (row.previous_match_id !== null && row.previous_match_id !== "" && row.type) {
        match.previousMatches.push({ previousMatchId: row.previous_match_id, type: row.type });
      }

      byId.set(row.id, match);
    }

    return { hasBracket: stage?.has_bracket ?? false, matches: [...byId.values()] };
  }
  async save(model: Match) {
    let row =
      this.staged.get(model.id) ??
      (await this.em.findOne(
        MatchRow,
        { id: model.id },
        { populate: ["participants", "results", "previousMatches"] },
      ));

    if (!row) {
      row = new MatchRow();
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
      viewership: unchangedJson(row.viewership, model.viewership),
      vods: model.vods,
      sourceUrl: model.sourceUrl,
    });
    row.tournament = this.em.getReference(TournamentRow, model.tournament.id);
    row.winner = model.winner
      ? this.em.getReference(TournamentParticipantRow, model.winner.id)
      : null;
    row.participants.set(
      model.participants.map((p) => this.em.getReference(TournamentParticipantRow, p.id)),
    );
    const existingResults = new Map(row.results.getItems().map((result) => [result.id, result]));
    const existingLinks = new Map(row.previousMatches.getItems().map((link) => [link.id, link]));

    const resultIds = new Set(model.results.map((r) => r.id));
    const linkIds = new Set(model.previousMatches.map((l) => l.id));

    if (row.results.isInitialized()) {
      for (const result of row.results.getItems()) {
        if (!resultIds.has(result.id)) {
          this.em.remove(result);
        }
      }
    }

    if (row.previousMatches.isInitialized()) {
      for (const link of row.previousMatches.getItems()) {
        if (!linkIds.has(link.id)) {
          this.em.remove(link);
        }
      }
    }

    row.results.set(
      model.results.map((r) => {
        const result = existingResults.get(r.id) ?? new MatchResultRow();
        result.id = r.id;
        result.match = row;
        result.participant = this.em.getReference(TournamentParticipantRow, r.participant.id);
        result.score = r.score;
        this.em.persist(result);

        return result;
      }),
    );
    row.previousMatches.set(
      model.previousMatches.map((l) => {
        const link = existingLinks.get(l.id) ?? new BracketLinkRow();
        link.id = l.id;
        link.match = row;
        link.previousMatch = this.em.getReference(MatchRow, l.previousMatch.id);
        link.type = l.type;
        this.em.persist(link);

        return link;
      }),
    );
    this.em.persist(row);
    this.staged.set(row.id, row);
  }
}
