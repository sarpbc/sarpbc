import { describe, expect, it } from "vitest";
import {
  STARTGG_STAGE_ID,
  fact,
  player,
  grandFinal,
  onThisDaySources,
  stage,
  transfer,
} from "../../../test/on-this-day.fixture";
import { OnThisDayService } from "./on-this-day.service";

const NOW = new Date("2026-12-06T09:00:00Z");
const ON = { day: 6, month: 12, year: 2026 };

const anySlug: unknown = expect.any(String);

describe(OnThisDayService, () => {
  it("queries the requested month and day in the site time zone, before its year", async () => {
    const { sources, tournaments, transfers, facts } = onThisDaySources();

    const day = await new OnThisDayService(sources).forDay(ON, NOW);

    expect(day).toStrictEqual({ date: "2026-12-06", events: [] });
    const query = { beforeYear: 2026, day: 6, month: 12, timeZone: "Europe/Paris" };
    expect(tournaments.wonOnDay).toHaveBeenCalledWith(query);
    expect(tournaments.finalsOnDay).toHaveBeenCalledWith(query);
    expect(transfers.onDay).toHaveBeenCalledWith(12, 6, NOW);
    expect(facts.onDay).toHaveBeenCalledWith(12, 6);
  });

  it("defaults to today in Europe/Paris", async () => {
    const { sources, tournaments } = onThisDaySources();

    const day = await new OnThisDayService(sources).forDay(null, new Date("2026-12-31T23:30:00Z"));

    expect(day.date).toBe("2027-01-01");
    expect(tournaments.wonOnDay).toHaveBeenCalledWith(
      expect.objectContaining({ beforeYear: 2027, day: 1, month: 1 }),
    );
  });

  it("builds titles, finals and transfers from structured fields only", async () => {
    const won = stage("worlds-playoffs", "pandascore", "2024-12-06T21:00:00Z");
    const decided = stage("major-playoffs", "manual", "2023-12-06T20:00:00Z");

    const { sources } = onThisDaySources({
      finals: [grandFinal(decided, "2023-12-06T19:30:00Z")],
      titles: [won, decided],
      transfers: [transfer("contract", "arrival", "2022-12-06")],
    });

    const { events } = await new OnThisDayService(sources).forDay(ON, NOW);

    const kc = {
      darkModeImageUrl: null,
      imageUrl: "https://cdn.example/kc.png",
      logoDarkUrl: null,
      logoLightUrl: null,
      name: "Karmine Corp",
      slug: "karmine-corp",
    };

    const tournament = {
      event: { name: "RLCS 2024 World Championship", slug: "rlcs-worlds-2024" },
      name: "Playoffs",
      slug: "playoffs",
    };

    const vatira = { name: "Vatira", slug: "vatira" };
    expect(events).toStrictEqual([
      {
        date: "2024-12-06",
        kind: "title",
        tournament,
        winner: { players: [vatira], team: kc },
        year: 2024,
      },
      {
        date: "2023-12-06",
        kind: "final",
        loser: {
          players: [vatira],
          score: 2,
          team: { ...kc, imageUrl: null, name: "Team BDS", slug: "team-bds" },
        },
        match: { publicId: 42, slug: anySlug },
        tournament,
        winner: { players: [vatira], score: 4, team: kc },
        year: 2023,
      },
      {
        date: "2022-12-06",
        kind: "transfer",
        player: vatira,
        team: kc,
        type: "arrival",
        year: 2022,
      },
    ]);
    expect(JSON.stringify(events)).not.toMatch(/"id":/u);
  });

  it("lists birthdays with the age reached, after titles and before transfers", async () => {
    const { sources, players } = onThisDaySources({
      players: [player("2001-12-06"), player("2026-12-06"), player(null)],
      titles: [stage("worlds-playoffs", "pandascore", "2024-12-06T21:00:00Z")],
      transfers: [transfer("contract", "arrival", "2022-12-06")],
    });

    const { events } = await new OnThisDayService(sources).forDay(ON, NOW);

    expect(players.bornOnDay).toHaveBeenCalledWith(12, 6);
    expect(events.map(({ kind }) => kind)).toStrictEqual(["title", "birthday", "transfer"]);
    expect(events[1]).toStrictEqual({
      age: 25,
      date: "2001-12-06",
      kind: "birthday",
      player: { name: "Vatira", slug: "vatira" },
      year: 2001,
    });
  });

  it("drops start.gg titles, finals and facts linked to start.gg from the public payload", async () => {
    const startggStage = stage("community-cup", "startgg", "2024-12-06T18:00:00Z");
    const manualStage = stage("cup", "manual", "2021-12-06T18:00:00Z");

    const { sources } = onThisDaySources({
      facts: [
        fact({
          link: {
            event: { name: "Community Cup", slug: "community-cup" },
            id: STARTGG_STAGE_ID,
            kind: "tournament",
            name: "Open qualifier",
            slug: "open-qualifier",
            source: "startgg",
          },
        }),
      ],
      finals: [
        grandFinal(startggStage, "2024-12-06T17:00:00Z"),
        grandFinal(manualStage, "2021-12-06T17:00:00Z", { source: "startgg" }),
      ],
      titles: [startggStage, manualStage],
    });

    const { events } = await new OnThisDayService(sources).forDay(ON, NOW);

    expect(events).toStrictEqual([expect.objectContaining({ kind: "title", year: 2021 })]);
  });

  it("shows only staff facts of this day that are not dated in a future year", async () => {
    const { sources } = onThisDaySources({
      facts: [
        fact({ textEn: "Every year", textFr: "Chaque année", year: null }),
        fact({ year: 2015 }),
        fact({ year: 2027 }),
        fact({ day: 7 }),
      ],
      transfers: [transfer("this-year", "departure", "2026-12-06")],
    });

    const { events } = await new OnThisDayService(sources).forDay(ON, NOW);

    expect(events.map((event) => (event.kind === "fact" ? event.year : event.kind))).toStrictEqual([
      null,
      2015,
    ]);
  });

  it("returns the staff text as written next to structured fields, never a generated sentence", async () => {
    const written = fact({
      link: {
        id: "vatira-id",
        kind: "player",
        name: "Vatira",
        slug: "vatira",
        source: null,
      },
    });

    const { sources } = onThisDaySources({
      facts: [written],
      titles: [stage("worlds-playoffs", "pandascore", "2024-12-06T21:00:00Z")],
    });

    const { events } = await new OnThisDayService(sources).forDay(ON, NOW);

    expect(events[0]).toStrictEqual({
      kind: "fact",
      link: { kind: "player", name: "Vatira", slug: "vatira" },
      sourceUrl: written.sourceUrl,
      text: { en: written.textEn, fr: written.textFr },
      year: 2015,
    });
    expect(events).toHaveLength(2);
    expect(Object.keys(events[1] ?? {}).toSorted()).toStrictEqual([
      "date",
      "kind",
      "tournament",
      "winner",
      "year",
    ]);
  });
});
