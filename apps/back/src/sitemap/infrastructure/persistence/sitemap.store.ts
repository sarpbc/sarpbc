import { EntityManager } from "@mikro-orm/postgresql";
import { z } from "zod";
import type { SitemapKind } from "@sarpbc/types";
import type {
  MatchSitemapRow,
  SitemapPage,
  SitemapQueries,
  TournamentSitemapRow,
} from "../../application/ports";

const LISTED_PLAYERS = `
  FROM player p
  WHERE p.merged_into_id IS NULL
    AND (
      p.team_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM contract c WHERE c.player_id = p.id)
      OR EXISTS (SELECT 1 FROM tournament_participant_players tpp WHERE tpp.player_id = p.id)
    )`;

const LISTED_TEAMS = `
  FROM team t
  WHERE t.merged_into_id IS NULL
    AND (
      EXISTS (SELECT 1 FROM tournament_participant tp WHERE tp.team_id = t.id)
      OR EXISTS (SELECT 1 FROM contract c WHERE c.team_id = t.id)
      OR EXISTS (SELECT 1 FROM player p WHERE p.team_id = t.id AND p.merged_into_id IS NULL)
    )`;

// The name test matches matchSlug, which treats a blank or "TBD" team as unknown.
const KNOWN_MATCH_TEAMS = `
  FROM match_participants mp
  JOIN tournament_participant tp ON tp.id = mp.tournament_participant_id
  JOIN team t ON t.id = tp.team_id
  WHERE mp.match_id = m.id AND lower(btrim(t.name)) NOT IN ('', 'tbd')`;

const LISTED_MATCHES = `
  FROM "match" m
  JOIN tournament s ON s.id = m.tournament_id
  JOIN tournament_event e ON e.id = s.event_id
  WHERE m.status IS DISTINCT FROM 'canceled'
    AND (SELECT count(*) ${KNOWN_MATCH_TEAMS}) = 2`;

const countsRow = z.object({
  tournaments: z.number(),
  matches: z.number(),
  players: z.number(),
  teams: z.number(),
});
const tournamentRows = z.array(
  z.object({
    event_slug: z.string(),
    stage_slug: z.string().nullable(),
    lastmod: z.coerce.date(),
  }),
);
const matchRows = z.array(
  z.object({
    public_id: z.number(),
    name: z.string(),
    event_slug: z.string(),
    stage_slug: z.string(),
    team_names: z.tuple([z.string(), z.string()]),
    lastmod: z.coerce.date(),
  }),
);
const slugRows = z.array(z.object({ slug: z.string() }));

export class SitemapStore implements SitemapQueries {
  constructor(private readonly em: EntityManager) {}

  async counts(): Promise<Record<SitemapKind, number>> {
    const rows: unknown[] = await this.em.getConnection().execute(`
      SELECT
        (SELECT count(*) FROM tournament)::int
          + (SELECT count(DISTINCT event_id) FROM tournament)::int AS tournaments,
        (SELECT count(*) ${LISTED_MATCHES})::int AS matches,
        (SELECT count(*) ${LISTED_PLAYERS})::int AS players,
        (SELECT count(*) ${LISTED_TEAMS})::int AS teams
    `);
    return countsRow.parse(rows[0]);
  }

  async tournaments({ offset, limit }: SitemapPage): Promise<TournamentSitemapRow[]> {
    const rows: unknown = await this.em.getConnection().execute(
      `
        SELECT e.slug AS event_slug, NULL::text AS stage_slug, max(s.updated_at) AS lastmod
        FROM tournament_event e
        JOIN tournament s ON s.event_id = e.id
        GROUP BY e.id
        UNION ALL
        SELECT e.slug, s.slug, s.updated_at
        FROM tournament s
        JOIN tournament_event e ON e.id = s.event_id
        ORDER BY event_slug, stage_slug NULLS FIRST
        LIMIT ? OFFSET ?
      `,
      [limit, offset],
    );
    return tournamentRows.parse(rows).map((row) => ({
      eventSlug: row.event_slug,
      stageSlug: row.stage_slug,
      lastmod: row.lastmod,
    }));
  }

  async matches({ offset, limit }: SitemapPage): Promise<MatchSitemapRow[]> {
    const rows: unknown = await this.em.getConnection().execute(
      `
        SELECT
          m.public_id,
          m.name,
          e.slug AS event_slug,
          s.slug AS stage_slug,
          ARRAY(SELECT t.name ${KNOWN_MATCH_TEAMS}) AS team_names,
          m.updated_at AS lastmod
        ${LISTED_MATCHES}
        ORDER BY m.public_id
        LIMIT ? OFFSET ?
      `,
      [limit, offset],
    );
    return matchRows.parse(rows).map((row) => ({
      publicId: row.public_id,
      name: row.name,
      eventSlug: row.event_slug,
      stageSlug: row.stage_slug,
      teamNames: row.team_names,
      lastmod: row.lastmod,
    }));
  }

  playerSlugs(page: SitemapPage): Promise<string[]> {
    return this.slugs(`SELECT p.slug ${LISTED_PLAYERS} ORDER BY p.slug, p.id`, page);
  }

  teamSlugs(page: SitemapPage): Promise<string[]> {
    return this.slugs(`SELECT t.slug ${LISTED_TEAMS} ORDER BY t.slug, t.id`, page);
  }

  private async slugs(query: string, { offset, limit }: SitemapPage): Promise<string[]> {
    const rows: unknown = await this.em
      .getConnection()
      .execute(`${query} LIMIT ? OFFSET ?`, [limit, offset]);
    return slugRows.parse(rows).map((row) => row.slug);
  }
}
