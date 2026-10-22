import { Migration } from "@mikro-orm/migrations";
import { allocateSlug, eventSlug, stageSlug, toSlug } from "@sarpbc/utils";
import { v4 } from "uuid";
import { z } from "zod";

// Production runs migrations from src through Node's type stripping, where extensionless relative
// imports fail to resolve. Keep this file free of app imports: it is a frozen copy of the domain rules.
const GENERIC_STAGE_NAMES = new Set([
  "playoffs",
  "group stage",
  "group a",
  "group b",
  "group c",
  "group d",
  "swiss",
  "main event",
  "grand finals",
  "finals",
]);

function eventDisplayName(input: {
  leagueName: string | null;
  serieName: string | null;
  stageName: string;
}): string {
  const league = input.leagueName?.trim();
  const serie = input.serieName?.trim();
  const stage = input.stageName.trim();
  if (serie) {
    if (/^\d{4}$/.test(serie)) {
      if (league) return `${league} ${serie}`;
      return stage && !GENERIC_STAGE_NAMES.has(stage.toLowerCase()) ? stage : serie;
    }
    return league && !serie.toLowerCase().startsWith(league.toLowerCase())
      ? `${league} ${serie}`
      : serie;
  }
  if (league && stage) return `${league} ${stage}`;
  return stage || league || "";
}

function utcDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function compareStages(
  a: { beginAt: Date | null; name: string },
  b: { beginAt: Date | null; name: string },
): number {
  return utcDay(b.beginAt).localeCompare(utcDay(a.beginAt)) || a.name.localeCompare(b.name);
}

const stageRow = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string().nullable(),
    serie: z.string().nullable(),
    source: z.string(),
    begin_at: z.coerce.date().nullable(),
    league_id: z.string().nullable(),
    league_name: z.string().nullable(),
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    serie: row.serie,
    source: row.source,
    beginAt: row.begin_at,
    leagueId: row.league_id,
    leagueName: row.league_name,
  }));
type StageRow = z.infer<typeof stageRow>;

function chronology(
  a: { beginAt: Date | null; id: string },
  b: { beginAt: Date | null; id: string },
) {
  const at = a.beginAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bt = b.beginAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return at === bt ? a.id.localeCompare(b.id) : at < bt ? -1 : 1;
}

function groupKey(stage: StageRow): string {
  const serie = stage.serie?.trim();
  return serie ? `${stage.leagueId ?? ""}::${serie}` : `stage::${stage.id}`;
}

export class Migration20261022120000_addTournamentEvents extends Migration {
  override name = "Migration20261022120000_addTournamentEvents";

  override async up(): Promise<void> {
    const stages = z
      .array(stageRow)
      .parse(
        await this.execute(
          `select t."id", t."name", t."slug", t."serie", t."source", t."begin_at", t."league_id", l."name" as "league_name" from "tournament" t left join "league" l on l."id" = t."league_id";`,
        ),
      );
    const groups = new Map<string, StageRow[]>();
    for (const stage of stages) {
      const key = groupKey(stage);
      groups.set(key, [...(groups.get(key) ?? []), stage]);
    }
    const ordered = [...groups.values()]
      .map((group) => {
        const sorted = [...group].sort(chronology);
        const minId = group.map((stage) => stage.id).sort()[0];
        return { stages: sorted, order: { beginAt: sorted[0].beginAt, id: minId } };
      })
      .sort((a, b) => chronology(a.order, b.order))
      .map((group) => group.stages);

    await this.execute(
      `create table "tournament_event" ("id" varchar(255) not null, "pandascore_serie_id" int null, "slug" varchar(255) not null, "name" varchar(255) not null, "league_id" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "tournament_event_pkey" primary key ("id"));`,
    );
    await this.execute(`alter table "tournament" add "event_id" varchar(255) null;`);

    const eventSlugs = new Set<string>();
    for (const group of ordered) {
      const [first] = group;
      const manual = group.length === 1 && first.source === "manual" && !first.serie?.trim();
      const newest = [...group].sort(compareStages)[0];
      const name = manual
        ? first.name
        : eventDisplayName({
            leagueName: newest.leagueName,
            serieName: newest.serie,
            stageName: newest.name,
          });
      const base = manual
        ? toSlug(first.slug) || eventSlug(name, null)
        : eventSlug(name, first.beginAt?.getUTCFullYear() ?? null);
      const slug = await allocateSlug(base, (candidate) => eventSlugs.has(candidate));
      eventSlugs.add(slug);
      const eventId = v4();
      await this.execute(
        `insert into "tournament_event" ("id", "pandascore_serie_id", "slug", "name", "league_id", "created_at", "updated_at") values (?, null, ?, ?, ?, now(), now());`,
        [eventId, slug, name, first.leagueId],
      );
      const stageSlugs = new Set<string>();
      for (const stage of group) {
        const allocated = await allocateSlug(stageSlug(stage.name), (candidate) =>
          stageSlugs.has(candidate),
        );
        stageSlugs.add(allocated);
        await this.execute(`update "tournament" set "event_id" = ?, "slug" = ? where "id" = ?;`, [
          eventId,
          allocated,
          stage.id,
        ]);
      }
    }

    await this.execute(
      `alter table "tournament_event" add constraint "tournament_event_pandascore_serie_id_unique" unique ("pandascore_serie_id");`,
    );
    await this.execute(
      `alter table "tournament_event" add constraint "tournament_event_slug_unique" unique ("slug");`,
    );
    await this.execute(
      `alter table "tournament_event" add constraint "tournament_event_league_id_foreign" foreign key ("league_id") references "league" ("id") on update cascade on delete set null;`,
    );
    await this.execute(`alter table "tournament" alter column "event_id" set not null;`);
    await this.execute(`alter table "tournament" alter column "slug" set not null;`);
    await this.execute(
      `alter table "tournament" add constraint "tournament_event_id_foreign" foreign key ("event_id") references "tournament_event" ("id") on update cascade;`,
    );
    await this.execute(
      `alter table "tournament" add constraint "tournament_event_id_slug_unique" unique ("event_id", "slug");`,
    );
    await this.execute(`alter table "tournament" drop column "serie";`);
  }

  override down(): void {
    this.addSql(`alter table "tournament" add "serie" varchar(255) null;`);
    this.addSql(
      `update "tournament" set "serie" = e."name" from "tournament_event" e where e."id" = "tournament"."event_id";`,
    );
    this.addSql(`alter table "tournament" drop constraint "tournament_event_id_slug_unique";`);
    this.addSql(`alter table "tournament" drop constraint "tournament_event_id_foreign";`);
    this.addSql(`alter table "tournament" alter column "slug" drop not null;`);
    this.addSql(`alter table "tournament" drop column "event_id";`);
    this.addSql(`drop table if exists "tournament_event" cascade;`);
  }
}
