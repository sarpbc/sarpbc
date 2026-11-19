import type {
  OnThisDay,
  OnThisDayEvent,
  OnThisDayFact,
  OnThisDayLink,
  OnThisDayPlayer,
  OnThisDaySide,
  OnThisDayTeam,
  OnThisDayTournament,
} from "@sarpbc/types";
import { SITE_TIME_ZONE, calendarDayIn, formatIsoDay } from "@sarpbc/utils";
import type { CalendarDay } from "@sarpbc/utils";
import { isRedistributable } from "../../common/domain/data-source";
import type { PlayerService } from "../../roster/application/player.service";
import type { Player } from "../../roster/domain/player";
import type { Team } from "../../roster/domain/team";
import type { Transfer } from "../../roster/domain/transfer";
import type { TransferService } from "../../roster/application/transfer.service";
import { matchPublicSlug } from "../../tournament/domain/match";
import type { Match, TournamentSummary } from "../../tournament/domain/match";
import type { Tournament } from "../../tournament/domain/tournament";
import type { TournamentParticipant } from "../../tournament/domain/tournament-participant";
import type { TournamentQueries } from "../../tournament/application/ports";
import { isFactShownOn } from "../domain/on-this-day-fact";
import type { OnThisDayFactStore } from "./ports";

export interface OnThisDaySources {
  tournaments: Pick<TournamentQueries, "wonOnDay" | "finalsOnDay">;
  transfers: Pick<TransferService, "onDay">;
  players: Pick<PlayerService, "bornOnDay">;
  facts: Pick<OnThisDayFactStore, "onDay">;
}

type EventOf<K extends OnThisDayEvent["kind"]> = Extract<OnThisDayEvent, { kind: K }>;

const toTeam = (team: Team) =>
  ({
    darkModeImageUrl: team.darkModeImageUrl,
    imageUrl: team.imageUrl,
    logoDarkUrl: team.logoDarkUrl,
    logoLightUrl: team.logoLightUrl,
    name: team.name,
    slug: team.slug,
  }) satisfies OnThisDayTeam;

const toPlayer = (player: Pick<Player, "name" | "slug">) =>
  ({
    name: player.name,
    slug: player.slug,
  }) satisfies OnThisDayPlayer;

const toTournament = (tournament: Pick<TournamentSummary, "name" | "slug" | "event">) => {
  const { name, slug, event } = tournament;

  return {
    event: { name: event.name, slug: event.slug },
    name,
    slug,
  } satisfies OnThisDayTournament;
};

const toSide = (participant: TournamentParticipant, match: Match) => {
  const result = match.results.find((entry) => entry.participant.id === participant.id);

  return {
    players: participant.players.map(toPlayer),
    score: result?.score ?? null,
    team: participant.team ? toTeam(participant.team) : null,
  } satisfies OnThisDaySide;
};

const dated = (at: Date) => {
  const day = calendarDayIn(at, SITE_TIME_ZONE);

  return { date: formatIsoDay(day), year: day.year };
};

const title = (tournament: Tournament) => {
  const { winner, endAt } = tournament;

  if (!winner || !endAt || !isRedistributable(tournament.source)) {
    return [] satisfies OnThisDayEvent[];
  }

  return [
    {
      kind: "title",
      ...dated(endAt),
      tournament: toTournament(tournament),
      winner: {
        players: winner.players.map(toPlayer),
        team: winner.team ? toTeam(winner.team) : null,
      },
    } satisfies EventOf<"title">,
  ];
};

const final = (match: Match) => {
  const { winner, endAt, tournament } = match;

  if (!winner || !endAt) {
    return [] satisfies OnThisDayEvent[];
  }

  if (!isRedistributable(match.source) || !isRedistributable(tournament.source)) {
    return [] satisfies OnThisDayEvent[];
  }

  const loser = match.participants.find((participant) => participant.id !== winner.id);

  if (match.participants.length !== 2 || !loser) {
    return [] satisfies OnThisDayEvent[];
  }

  return [
    {
      kind: "final",
      ...dated(endAt),
      loser: toSide(loser, match),
      match: { publicId: match.publicId, slug: matchPublicSlug(match) },
      tournament: toTournament(tournament),
      winner: toSide(winner, match),
    } satisfies EventOf<"final">,
  ];
};

const transfer = ({ type, date, contract }: Transfer) =>
  ({
    date: date.toISOString().slice(0, 10),
    kind: "transfer",
    player: toPlayer(contract.player),
    team: toTeam(contract.team),
    type,
    year: date.getUTCFullYear(),
  }) satisfies EventOf<"transfer">;

const birthday = (on: CalendarDay) => (player: Player) => {
  const born = player.birthday;

  if (!born || born.getUTCFullYear() >= on.year) {
    return [];
  }

  return [
    {
      age: on.year - born.getUTCFullYear(),
      date: born.toISOString().slice(0, 10),
      kind: "birthday",
      player: toPlayer(player),
      year: born.getUTCFullYear(),
    } satisfies EventOf<"birthday">,
  ];
};

const publicLink = (link: NonNullable<OnThisDayFact["link"]>) => {
  switch (link.kind) {
    case "player": {
      return { kind: "player", name: link.name, slug: link.slug } satisfies OnThisDayLink;
    }

    case "team": {
      return { kind: "team", name: link.name, slug: link.slug } satisfies OnThisDayLink;
    }

    case "tournament": {
      return {
        event: { name: link.event.name, slug: link.event.slug },
        kind: "tournament",
        name: link.name,
        slug: link.slug,
      } satisfies OnThisDayLink;
    }

    case "match": {
      return {
        kind: "match",
        name: link.name,
        publicId: link.publicId,
        slug: link.slug,
      } satisfies OnThisDayLink;
    }

    default: {
      const exhaustive: never = link;

      return exhaustive satisfies OnThisDayLink;
    }
  }
};

const fact = ({ year, textEn, textFr, link, sourceUrl }: OnThisDayFact) => {
  if (link?.source && !isRedistributable(link.source)) {
    return [] satisfies OnThisDayEvent[];
  }

  return [
    {
      kind: "fact",
      link: link ? publicLink(link) : null,
      sourceUrl,
      text: { en: textEn, fr: textFr },
      year,
    } satisfies EventOf<"fact">,
  ];
};

const rank = (event: OnThisDayEvent) => {
  switch (event.kind) {
    case "fact": {
      return 0;
    }

    case "title":
    case "final": {
      return 1;
    }

    case "birthday": {
      return 2;
    }

    case "transfer": {
      return 3;
    }

    default: {
      const exhaustive: never = event;

      return exhaustive;
    }
  }
};

const yearOf = ({ year }: OnThisDayEvent) => year ?? Number.MAX_SAFE_INTEGER;

const byInterest = (a: OnThisDayEvent, b: OnThisDayEvent) =>
  rank(a) - rank(b) || yearOf(b) - yearOf(a);

export class OnThisDayService {
  constructor(private readonly sources: OnThisDaySources) {}

  async forDay(requested: CalendarDay | null, now = new Date()) {
    const on = requested ?? calendarDayIn(now, SITE_TIME_ZONE);
    const day = { beforeYear: on.year, day: on.day, month: on.month, timeZone: SITE_TIME_ZONE };

    const [titles, finals, transfers, facts, born] = await Promise.all([
      this.sources.tournaments.wonOnDay(day),
      this.sources.tournaments.finalsOnDay(day),
      this.sources.transfers.onDay(on.month, on.day, now),
      this.sources.facts.onDay(on.month, on.day),
      this.sources.players.bornOnDay(on.month, on.day),
    ]);

    const finalEvents = finals.map((match) => ({
      events: final(match),
      stageId: match.tournament.id,
    }));

    const decidedInFinal = new Set(
      finalEvents.filter(({ events }) => events.length > 0).map(({ stageId }) => stageId),
    );

    const events = [
      ...facts.filter((entry) => isFactShownOn(entry, on)).flatMap(fact),
      ...titles.filter(({ id }) => !decidedInFinal.has(id)).flatMap(title),
      ...finalEvents.flatMap(({ events: stageEvents }) => stageEvents),
      ...born.flatMap(birthday(on)),
      ...transfers.filter(({ date }) => date.getUTCFullYear() < on.year).map(transfer),
    ];

    return { date: formatIsoDay(on), events: events.toSorted(byInterest) } satisfies OnThisDay;
  }
}
