import { describe, expect, it } from "vitest";
import {
  STARTGG_STAGE_ID,
  fact,
  grandFinal,
  onThisDaySources,
  stage,
  transfer,
} from "../../../test/on-this-day-fixtures";
import { OnThisDayService } from "./on-this-day.service";

const NOW = new Date("2026-12-06T09:00:00Z");
const ON = { year: 2026, month: 12, day: 6 };

const anySlug: unknown = expect.any(String);

describe(OnThisDayService, () => {
  it("queries the requested month and day in the site time zone, before its year", async () => {
    const { sources, tournaments, transfers, facts } = onThisDaySources();

    const day = await new OnThisDayService(sources).forDay(ON, NOW);

    expect(day).toStrictEqual({ date: "2026-12-06", events: [] });
    const query = { month: 12, day: 6, timeZone: "Europe/Paris", beforeYear: 2026 };
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
      expect.objectContaining({ month: 1, day: 1, beforeYear: 2027 }),
    );
  });

  it("builds titles, finals and transfers from structured fields only", async () => {
    const won = stage("worlds-playoffs", "pandascore", "2024-12-06T21:00:00Z");
    const decided = stage("major-playoffs", "manual", "2023-12-06T20:00:00Z");

    const { sources } = onThisDaySources({
      titles: [won, decided],
      finals: [grandFinal(decided, "2023-12-06T19:30:00Z")],
      transfers: [transfer("contract", "arrival", "2022-12-06")],
    });

    const { events } = await new OnThisDayService(sources).forDay(ON, NOW);

    const kc = {
      name: "Karmine Corp",
      slug: "karmine-corp",
      imageUrl: "https://cdn.example/kc.png",
      darkModeImageUrl: null,
      logoLightUrl: null,
      logoDarkUrl: null,
    };

    const tournament = {
      name: "Playoffs",
      slug: "playoffs",
      event: { name: "RLCS 2024 World Championship", slug: "rlcs-worlds-2024" },
    };

    const vatira = { name: "Vatira", slug: "vatira" };
    expect(events).toStrictEqual([
      {
        kind: "title",
        year: 2024,
        date: "2024-12-06",
        tournament,
        winner: { team: kc, players: [vatira] },
      },
      {
        kind: "final",
        year: 2023,
        date: "2023-12-06",
        tournament,
        match: { publicId: 42, slug: anySlug },
        winner: { team: kc, players: [vatira], score: 4 },
        loser: {
          team: { ...kc, name: "Team BDS", slug: "team-bds", imageUrl: null },
          players: [vatira],
          score: 2,
        },
      },
      {
        kind: "transfer",
        year: 2022,
        date: "2022-12-06",
        type: "arrival",
        player: vatira,
        team: kc,
      },
    ]);
    expect(JSON.stringify(events)).not.toMatch(/"id":/);
  });

  it("drops start.gg titles, finals and facts linked to start.gg from the public payload", async () => {
    const startggStage = stage("community-cup", "startgg", "2024-12-06T18:00:00Z");
    const manualStage = stage("cup", "manual", "2021-12-06T18:00:00Z");

    const { sources } = onThisDaySources({
      titles: [startggStage, manualStage],
      finals: [
        grandFinal(startggStage, "2024-12-06T17:00:00Z"),
        grandFinal(manualStage, "2021-12-06T17:00:00Z", { source: "startgg" }),
      ],
      facts: [
        fact({
          link: {
            kind: "tournament",
            id: STARTGG_STAGE_ID,
            name: "Open qualifier",
            slug: "open-qualifier",
            event: { name: "Community Cup", slug: "community-cup" },
            source: "startgg",
          },
        }),
      ],
    });

    const { events } = await new OnThisDayService(sources).forDay(ON, NOW);

    expect(events).toStrictEqual([expect.objectContaining({ kind: "title", year: 2021 })]);
  });

  it("shows only staff facts of this day that are not dated in a future year", async () => {
    const { sources } = onThisDaySources({
      facts: [
        fact({ year: null, textEn: "Every year", textFr: "Chaque année" }),
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
        kind: "player",
        id: "vatira-id",
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
      year: 2015,
      text: { en: written.textEn, fr: written.textFr },
      link: { kind: "player", name: "Vatira", slug: "vatira" },
      sourceUrl: written.sourceUrl,
    });
    expect(events).toHaveLength(2);
    expect(Object.keys(events[1] ?? {})).toStrictEqual([
      "kind",
      "year",
      "date",
      "tournament",
      "winner",
    ]);
  });
});
