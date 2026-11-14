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
  facts: Pick<OnThisDayFactStore, "onDay">;
}

const toTeam = (team: Team): OnThisDayTeam => ({
  name: team.name,
  slug: team.slug,
  imageUrl: team.imageUrl,
  darkModeImageUrl: team.darkModeImageUrl,
  logoLightUrl: team.logoLightUrl,
  logoDarkUrl: team.logoDarkUrl,
});

const toPlayer = (player: Pick<Player, "name" | "slug">): OnThisDayPlayer => ({
  name: player.name,
  slug: player.slug,
});

const toTournament = (
  tournament: Pick<TournamentSummary, "name" | "slug" | "event">,
): OnThisDayTournament => {
  const { name, slug, event } = tournament;

  return { name, slug, event: { name: event.name, slug: event.slug } };
};

const toSide = (participant: TournamentParticipant, match: Match): OnThisDaySide => {
  const result = match.results.find((entry) => entry.participant.id === participant.id);

  return {
    team: participant.team ? toTeam(participant.team) : null,
    players: participant.players.map(toPlayer),
    score: result?.score ?? null,
  };
};

const dated = (at: Date) => {
  const day = calendarDayIn(at, SITE_TIME_ZONE);

  return { year: day.year, date: formatIsoDay(day) };
};

const title = (tournament: Tournament): OnThisDayEvent[] => {
  const { winner, endAt } = tournament;

  if (!winner || !endAt || !isRedistributable(tournament.source)) {
    return [];
  }

  return [
    {
      kind: "title",
      ...dated(endAt),
      tournament: toTournament(tournament),
      winner: {
        team: winner.team ? toTeam(winner.team) : null,
        players: winner.players.map(toPlayer),
      },
    },
  ];
};

const final = (match: Match): OnThisDayEvent[] => {
  const { winner, endAt, tournament } = match;

  if (!winner || !endAt) {
    return [];
  }

  if (!isRedistributable(match.source) || !isRedistributable(tournament.source)) {
    return [];
  }

  const loser = match.participants.find((participant) => participant.id !== winner.id);

  if (match.participants.length !== 2 || !loser) {
    return [];
  }

  return [
    {
      kind: "final",
      ...dated(endAt),
      tournament: toTournament(tournament),
      match: { publicId: match.publicId, slug: matchPublicSlug(match) },
      winner: toSide(winner, match),
      loser: toSide(loser, match),
    },
  ];
};

const transfer = ({ type, date, contract }: Transfer): OnThisDayEvent => ({
  kind: "transfer",
  year: date.getUTCFullYear(),
  date: date.toISOString().slice(0, 10),
  type,
  player: toPlayer(contract.player),
  team: toTeam(contract.team),
});

const publicLink = (link: NonNullable<OnThisDayFact["link"]>): OnThisDayLink => {
  switch (link.kind) {
    case "player": {
      return { kind: "player", name: link.name, slug: link.slug };
    }

    case "team": {
      return { kind: "team", name: link.name, slug: link.slug };
    }

    case "tournament": {
      return {
        kind: "tournament",
        name: link.name,
        slug: link.slug,
        event: { name: link.event.name, slug: link.event.slug },
      };
    }

    case "match": {
      return { kind: "match", name: link.name, publicId: link.publicId, slug: link.slug };
    }

    default: {
      const exhaustive: never = link;

      return exhaustive;
    }
  }
};

const fact = ({ year, textEn, textFr, link, sourceUrl }: OnThisDayFact): OnThisDayEvent[] => {
  if (link?.source && !isRedistributable(link.source)) {
    return [];
  }

  return [
    {
      kind: "fact",
      year,
      text: { en: textEn, fr: textFr },
      link: link ? publicLink(link) : null,
      sourceUrl,
    },
  ];
};

const rank = (event: OnThisDayEvent): number => {
  switch (event.kind) {
    case "fact": {
      return 0;
    }

    case "title":
    case "final": {
      return 1;
    }

    case "transfer": {
      return 2;
    }

    default: {
      const exhaustive: never = event;

      return exhaustive;
    }
  }
};

const yearOf = ({ year }: OnThisDayEvent) => year ?? Number.MAX_SAFE_INTEGER;

const byInterest = (a: OnThisDayEvent, b: OnThisDayEvent): number =>
  rank(a) - rank(b) || yearOf(b) - yearOf(a);

export class OnThisDayService {
  constructor(private readonly sources: OnThisDaySources) {}

  async forDay(requested: CalendarDay | null, now = new Date()): Promise<OnThisDay> {
    const on = requested ?? calendarDayIn(now, SITE_TIME_ZONE);
    const day = { month: on.month, day: on.day, timeZone: SITE_TIME_ZONE, beforeYear: on.year };

    const [titles, finals, transfers, facts] = await Promise.all([
      this.sources.tournaments.wonOnDay(day),
      this.sources.tournaments.finalsOnDay(day),
      this.sources.transfers.onDay(on.month, on.day, now),
      this.sources.facts.onDay(on.month, on.day),
    ]);

    const finalEvents = finals.map((match) => ({
      stageId: match.tournament.id,
      events: final(match),
    }));

    const decidedInFinal = new Set(
      finalEvents.filter(({ events }) => events.length > 0).map(({ stageId }) => stageId),
    );

    const events = [
      ...facts.filter((entry) => isFactShownOn(entry, on)).flatMap(fact),
      ...titles.filter(({ id }) => !decidedInFinal.has(id)).flatMap(title),
      ...finalEvents.flatMap(({ events: stageEvents }) => stageEvents),
      ...transfers.filter(({ date }) => date.getUTCFullYear() < on.year).map(transfer),
    ];

    return { date: formatIsoDay(on), events: events.toSorted(byInterest) };
  }
}
