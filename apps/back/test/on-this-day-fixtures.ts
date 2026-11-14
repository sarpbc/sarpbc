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
  name: "Karmine Corp",
  slug: "karmine-corp",
  imageUrl: "https://cdn.example/kc.png",
});

export const bds = Object.assign(new Team(), { id: "bds-id", name: "Team BDS", slug: "team-bds" });

export const vatira = Object.assign(new Player(), {
  id: "vatira-id",
  name: "Vatira",
  slug: "vatira",
  nationality: "FR",
});

const worlds = {
  id: "worlds-event",
  slug: "rlcs-worlds-2024",
  name: "RLCS 2024 World Championship",
};

function side(id: string, team: Team): TournamentParticipant {
  return Object.assign(new TournamentParticipant(), { id, team, players: [vatira] });
}

export function stage(
  id: string,
  source: DataSource,
  endAt: string,
  winner = side(`${id}-kc`, kc),
) {
  return Object.assign(new Tournament(), {
    id,
    name: "Playoffs",
    slug: "playoffs",
    source,
    event: worlds,
    endAt: new Date(endAt),
    winner,
  });
}

export function grandFinal(
  tournament: Tournament,
  endAt: string,
  options: { source?: DataSource; publicId?: number } = {},
) {
  const winner = side(`${tournament.id}-kc`, kc);
  const loser = side(`${tournament.id}-bds`, bds);

  return Object.assign(new Match(), {
    id: `${tournament.id}-final`,
    publicId: options.publicId ?? 42,
    name: "Grand final",
    source: options.source ?? tournament.source,
    endAt: new Date(endAt),
    status: "finished",
    participants: [winner, loser],
    winner,
    results: [
      { id: "r1", match: { id: "m" }, participant: { id: winner.id }, score: 4 },
      { id: "r2", match: { id: "m" }, participant: { id: loser.id }, score: 2 },
    ],
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      event: tournament.event,
      source: tournament.source,
      beginAt: null,
      league: null,
      pickemsEnabled: false,
      pandascoreId: null,
      streams: [],
      eventStreams: [],
    },
  });
}

export function transfer(id: string, type: Transfer["type"], date: string): Transfer {
  const contract = Object.assign(new Contract(), {
    id,
    player: vatira,
    team: kc,
    startDate: new Date(date),
  });

  return { id: `${id}:join`, type, date: new Date(date), contract, sourceUrl: null };
}

export function fact(overrides: Partial<OnThisDayFact> = {}): OnThisDayFact {
  return {
    id: "fact-id",
    month: 12,
    day: 6,
    year: 2015,
    textEn: "Rocket League's first official league kicked off.",
    textFr: "La première ligue officielle de Rocket League débutait.",
    link: null,
    sourceUrl: "https://www.rocketleague.com/news",
    ...overrides,
  };
}

export function onThisDaySources(
  data: {
    titles?: Tournament[];
    finals?: Match[];
    transfers?: Transfer[];
    facts?: OnThisDayFact[];
  } = {},
) {
  const tournaments = {
    wonOnDay: vi.fn<OnThisDaySources["tournaments"]["wonOnDay"]>(async () => data.titles ?? []),
    finalsOnDay: vi.fn<OnThisDaySources["tournaments"]["finalsOnDay"]>(
      async () => data.finals ?? [],
    ),
  };

  const transfers = {
    onDay: vi.fn<OnThisDaySources["transfers"]["onDay"]>(async () => data.transfers ?? []),
  };

  const facts = { onDay: vi.fn<OnThisDaySources["facts"]["onDay"]>(async () => data.facts ?? []) };
  const sources: OnThisDaySources = { tournaments, transfers, facts };

  return { sources, tournaments, transfers, facts };
}

type FactLink = NonNullable<OnThisDayFact["link"]>;

export const STARTGG_STAGE_ID = "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b";
export const MANUAL_STAGE_ID = "0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f";

const LINKABLE = [
  {
    kind: "tournament",
    id: STARTGG_STAGE_ID,
    name: "Open qualifier",
    slug: "open-qualifier",
    event: { name: "Community Cup", slug: "community-cup" },
    source: "startgg",
  },
  {
    kind: "tournament",
    id: MANUAL_STAGE_ID,
    name: "Playoffs",
    slug: "playoffs",
    event: { name: "French Cup", slug: "french-cup" },
    source: "manual",
  },
] satisfies FactLink[];

const target = ({ kind, id }: OnThisDayFactLinkInput) =>
  LINKABLE.find((link) => link.kind === kind && link.id === id) ?? null;

export function memoryFactStore(): OnThisDayFactStore {
  const rows = new Map<string, OnThisDayFact>();

  return {
    list: async () => [...rows.values()],
    onDay: async (month, day) =>
      [...rows.values()].filter((row) => row.month === month && row.day === day),
    find: async (id) => rows.get(id) ?? null,
    linkExists: async (link) => target(link) !== null,
    save: async (id, { link, ...fields }: OnThisDayFactFields) => {
      rows.set(id, { id, ...fields, link: link ? target(link) : null });
    },
    remove: async (id) => rows.delete(id),
  };
}
