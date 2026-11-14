import type { DataSource, OnThisDayFact, OnThisDayFactLinkInput } from "@sarpbc/types";
import { vi } from "vitest";
import type { OnThisDaySources } from "../src/on-this-day/application/on-this-day.service";
import type { OnThisDayFactStore } from "../src/on-this-day/application/ports";
import type { OnThisDayFactFields } from "../src/on-this-day/domain/on-this-day-fact";
import { Contract } from "../src/roster/domain/contract";
import { Player } from "../src/roster/domain/player";
import { Team } from "../src/roster/domain/team";
import type { Transfer } from "../src/roster/domain/transfer";
import { Match } from "../src/tournament/domain/match";
import { Tournament } from "../src/tournament/domain/tournament";
import { TournamentParticipant } from "../src/tournament/domain/tournament-participant";

export const kc = Object.assign(new Team(), {
  id: "kc-id",
  imageUrl: "https://cdn.example/kc.png",
  name: "Karmine Corp",
  slug: "karmine-corp",
});

export const bds = Object.assign(new Team(), { id: "bds-id", name: "Team BDS", slug: "team-bds" });

export const vatira = Object.assign(new Player(), {
  id: "vatira-id",
  name: "Vatira",
  nationality: "FR",
  slug: "vatira",
});

const worlds = {
  id: "worlds-event",
  name: "RLCS 2024 World Championship",
  slug: "rlcs-worlds-2024",
};

const side = (id: string, team: Team): TournamentParticipant =>
  Object.assign(new TournamentParticipant(), { id, players: [vatira], team });

export const stage = (
  id: string,
  source: DataSource,
  endAt: string,
  winner = side(`${id}-kc`, kc),
) =>
  Object.assign(new Tournament(), {
    endAt: new Date(endAt),
    event: worlds,
    id,
    name: "Playoffs",
    slug: "playoffs",
    source,
    winner,
  });

export const grandFinal = (
  tournament: Tournament,
  endAt: string,
  options: { source?: DataSource; publicId?: number } = {},
) => {
  const winner = side(`${tournament.id}-kc`, kc);
  const loser = side(`${tournament.id}-bds`, bds);

  return Object.assign(new Match(), {
    endAt: new Date(endAt),
    id: `${tournament.id}-final`,
    name: "Grand final",
    participants: [winner, loser],
    publicId: options.publicId ?? 42,
    results: [
      { id: "r1", match: { id: "m" }, participant: { id: winner.id }, score: 4 },
      { id: "r2", match: { id: "m" }, participant: { id: loser.id }, score: 2 },
    ],
    source: options.source ?? tournament.source,
    status: "finished",
    tournament: {
      beginAt: null,
      event: tournament.event,
      eventStreams: [],
      id: tournament.id,
      league: null,
      name: tournament.name,
      pandascoreId: null,
      pickemsEnabled: false,
      slug: tournament.slug,
      source: tournament.source,
      streams: [],
    },
    winner,
  });
};

export const transfer = (id: string, type: Transfer["type"], date: string): Transfer => {
  const contract = Object.assign(new Contract(), {
    id,
    player: vatira,
    startDate: new Date(date),
    team: kc,
  });

  return { contract, date: new Date(date), id: `${id}:join`, sourceUrl: null, type };
};

export const fact = (overrides: Partial<OnThisDayFact> = {}): OnThisDayFact => ({
  day: 6,
  id: "fact-id",
  link: null,
  month: 12,
  sourceUrl: "https://www.rocketleague.com/news",
  textEn: "Rocket League's first official league kicked off.",
  textFr: "La première ligue officielle de Rocket League débutait.",
  year: 2015,
  ...overrides,
});

export const onThisDaySources = (
  data: {
    titles?: Tournament[];
    finals?: Match[];
    transfers?: Transfer[];
    facts?: OnThisDayFact[];
  } = {},
) => {
  const tournaments = {
    finalsOnDay: vi.fn<OnThisDaySources["tournaments"]["finalsOnDay"]>(
      async () => data.finals ?? [],
    ),
    wonOnDay: vi.fn<OnThisDaySources["tournaments"]["wonOnDay"]>(async () => data.titles ?? []),
  };

  const transfers = {
    onDay: vi.fn<OnThisDaySources["transfers"]["onDay"]>(async () => data.transfers ?? []),
  };

  const facts = { onDay: vi.fn<OnThisDaySources["facts"]["onDay"]>(async () => data.facts ?? []) };
  const sources: OnThisDaySources = { facts, tournaments, transfers };

  return { facts, sources, tournaments, transfers };
};

type FactLink = NonNullable<OnThisDayFact["link"]>;

export const STARTGG_STAGE_ID = "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b";
export const MANUAL_STAGE_ID = "0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f";

const LINKABLE = [
  {
    event: { name: "Community Cup", slug: "community-cup" },
    id: STARTGG_STAGE_ID,
    kind: "tournament",
    name: "Open qualifier",
    slug: "open-qualifier",
    source: "startgg",
  },
  {
    event: { name: "French Cup", slug: "french-cup" },
    id: MANUAL_STAGE_ID,
    kind: "tournament",
    name: "Playoffs",
    slug: "playoffs",
    source: "manual",
  },
] satisfies FactLink[];

const target = ({ kind, id }: OnThisDayFactLinkInput) =>
  LINKABLE.find((link) => link.kind === kind && link.id === id) ?? null;

export const memoryFactStore = (): OnThisDayFactStore => {
  const rows = new Map<string, OnThisDayFact>();

  return {
    find: async (id) => rows.get(id) ?? null,
    linkExists: async (link) => target(link) !== null,
    list: async () => [...rows.values()],
    onDay: async (month, day) =>
      [...rows.values()].filter((row) => row.month === month && row.day === day),
    remove: async (id) => rows.delete(id),
    save: async (id, { link, ...fields }: OnThisDayFactFields) => {
      rows.set(id, { id, ...fields, link: link ? target(link) : null });
    },
  };
};
