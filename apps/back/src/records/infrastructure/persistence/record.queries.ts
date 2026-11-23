import type { EntityManager } from "@mikro-orm/postgresql";
import { DATA_SOURCES, TOURNAMENT_FORMATS } from "@sarpbc/types";
import type { RecordVenue } from "@sarpbc/types";
import { z } from "zod";
import { Team } from "../../../roster/infrastructure/roster-persistence";
import type {
  AlmanacPlayer,
  AlmanacSeries,
  AlmanacTeam,
  EventTitle,
  RecordSources,
} from "../../application/ports";

const EVENT_TITLES = `
  with "last_stage" as (
    select distinct on ("t"."event_id") "t".*
    from "tournament" "t"
    order by "t"."event_id", "t"."end_at" desc nulls first, "t"."begin_at" desc nulls first, "t"."id"
  ),
  "title" as (
    select "s"."id", "s"."end_at", "s"."type", "s"."format", "s"."source", "s"."name", "s"."slug",
      "s"."winner_id", "e"."name" as "event_name", "e"."slug" as "event_slug"
    from "last_stage" "s"
    join "tournament_event" "e" on "e"."id" = "s"."event_id"
    where "s"."winner_id" is not null and "s"."end_at" is not null and "s"."end_at" <= now()
  )`;

const nullableText = z.string().nullable();

const titleRows = z.array(
  z.object({
    end_at: z.coerce.date(),
    event_name: z.string(),
    event_slug: z.string(),
    format: z.enum(TOURNAMENT_FORMATS),
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    source: z.enum(DATA_SOURCES),
    team_dark_mode_image_url: nullableText,
    team_id: nullableText,
    team_image_url: nullableText,
    team_logo_dark_url: nullableText,
    team_logo_light_url: nullableText,
    team_name: nullableText,
    team_national: z.boolean().nullable(),
    team_slug: nullableText,
    type: nullableText,
  }),
);

const titlePlayerRows = z.array(
  z.object({
    birthday: nullableText,
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    stage_id: z.string(),
  }),
);

const seriesRows = z.array(
  z.object({
    end_at: z.coerce.date(),
    format: z.enum(TOURNAMENT_FORMATS),
    loser_team_id: nullableText,
    national: z.boolean(),
    public_id: z.coerce.number(),
    source: z.enum(DATA_SOURCES),
    stage_source: z.enum(DATA_SOURCES),
    stage_type: nullableText,
    winner_team_id: nullableText,
  }),
);

type TitleRow = z.infer<typeof titleRows>[number];

const VENUES = new Map<string | null, RecordVenue>([
  ["offline", "lan"],
  ["online", "online"],
]);

const venueOf = (type: string | null) => VENUES.get(type) ?? null;

const titleTeam = (row: TitleRow) => {
  if (row.team_id === null || row.team_name === null || row.team_slug === null) {
    return null;
  }

  return {
    darkModeImageUrl: row.team_dark_mode_image_url,
    id: row.team_id,
    imageUrl: row.team_image_url,
    logoDarkUrl: row.team_logo_dark_url,
    logoLightUrl: row.team_logo_light_url,
    name: row.team_name,
    slug: row.team_slug,
  } satisfies AlmanacTeam;
};

export class RecordQueries implements RecordSources {
  constructor(private readonly em: EntityManager) {}

  async eventTitles() {
    const [titles, players] = await Promise.all([
      this.em.execute(
        `${EVENT_TITLES}
        select "title".*, "tm"."id" as "team_id", "tm"."name" as "team_name",
          "tm"."slug" as "team_slug", "tm"."image_url" as "team_image_url",
          "tm"."dark_mode_image_url" as "team_dark_mode_image_url",
          "tm"."logo_light_url" as "team_logo_light_url", "tm"."logo_dark_url" as "team_logo_dark_url",
          "tm"."national" as "team_national"
        from "title"
        join "tournament_participant" "w" on "w"."id" = "title"."winner_id"
        left join "team" "tm" on "tm"."id" = "w"."team_id"`,
      ),
      this.em.execute(
        `${EVENT_TITLES}
        select "title"."id" as "stage_id", "p"."id", "p"."name", "p"."slug",
          to_char("p"."birthday", 'YYYY-MM-DD') as "birthday"
        from "title"
        join "tournament_participant_players" "tpp"
          on "tpp"."tournament_participant_id" = "title"."winner_id"
        join "player" "p" on "p"."id" = "tpp"."player_id"`,
      ),
    ]);

    const playersByStage = Map.groupBy(
      titlePlayerRows.parse(players),
      ({ stage_id: stageId }) => stageId,
    );

    return titleRows.parse(titles).map(
      (row) =>
        ({
          endAt: row.end_at,
          format: row.format,
          nationalTeam: row.team_national === true,
          players: (playersByStage.get(row.id) ?? []).map(
            ({ id, name, slug, birthday }) =>
              ({ birthday, id, name, slug }) satisfies AlmanacPlayer,
          ),
          source: row.source,
          stage: {
            event: { name: row.event_name, slug: row.event_slug },
            name: row.name,
            slug: row.slug,
          },
          team: titleTeam(row),
          venue: venueOf(row.type),
        }) satisfies EventTitle,
    );
  }

  async decidedSeries() {
    const rows = seriesRows.parse(
      await this.em.execute(
        `select "m"."public_id", "m"."end_at", "m"."source", "t"."source" as "stage_source", "t"."type" as "stage_type",
          "t"."format", "w"."team_id" as "winner_team_id", "l"."team_id" as "loser_team_id",
          coalesce("wt"."national", false) or coalesce("lt"."national", false) as "national"
        from "match" "m"
        join "tournament" "t" on "t"."id" = "m"."tournament_id"
        join "tournament_participant" "w" on "w"."id" = "m"."winner_id"
        join "match_participants" "mp"
          on "mp"."match_id" = "m"."id" and "mp"."tournament_participant_id" <> "m"."winner_id"
        join "tournament_participant" "l" on "l"."id" = "mp"."tournament_participant_id"
        left join "team" "wt" on "wt"."id" = "w"."team_id"
        left join "team" "lt" on "lt"."id" = "l"."team_id"
        where "m"."end_at" is not null and "m"."end_at" <= now()
          and (select count(*) from "match_participants" "c" where "c"."match_id" = "m"."id") = 2`,
      ),
    );

    return rows.map(
      (row) =>
        ({
          endAt: row.end_at,
          format: row.format,
          loserTeamId: row.loser_team_id,
          nationalTeams: row.national,
          order: row.public_id,
          source: row.source,
          stageSource: row.stage_source,
          venue: venueOf(row.stage_type),
          winnerTeamId: row.winner_team_id,
        }) satisfies AlmanacSeries,
    );
  }

  async teams(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.em.find(
      Team,
      { id: { $in: ids }, mergedInto: null },
      { orderBy: { name: "ASC" } },
    );

    return rows.map(
      ({ id, name, slug, imageUrl, darkModeImageUrl, logoLightUrl, logoDarkUrl }) =>
        ({
          darkModeImageUrl,
          id,
          imageUrl,
          logoDarkUrl,
          logoLightUrl,
          name,
          slug,
        }) satisfies AlmanacTeam,
    );
  }
}
