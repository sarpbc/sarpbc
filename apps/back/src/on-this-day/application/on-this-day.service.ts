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
import { SITE_TIME_ZONE, calendarDayIn, formatIsoDay, type CalendarDay } from "@sarpbc/utils";
import { isRedistributable } from "../../common/domain/data-source";
import type { Player, Team } from "../../roster/domain/roster";
import type { Transfer } from "../../roster/domain/transfer";
import type { TransferService } from "../../roster/application/transfer.service";
import { matchPublicSlug } from "../../tournament/domain/competition";
import type {
  Match,
  Tournament,
  TournamentParticipant,
  TournamentSummary,
} from "../../tournament/domain/competition";
import type { TournamentQueries } from "../../tournament/application/ports";
import { isFactShownOn } from "../domain/on-this-day-fact";
import type { OnThisDayFactStore } from "./ports";

export interface OnThisDaySources {
  tournaments: Pick<TournamentQueries, "wonOnDay" | "finalsOnDay">;
  transfers: Pick<TransferService, "onDay">;
  facts: Pick<OnThisDayFactStore, "onDay">;
}

function toTeam(team: Team): OnThisDayTeam {
  return {
    name: team.name,
    slug: team.slug,
    imageUrl: team.imageUrl,
    darkModeImageUrl: team.darkModeImageUrl,
    logoLightUrl: team.logoLightUrl,
    logoDarkUrl: team.logoDarkUrl,
  };
}

function toPlayer(player: Pick<Player, "name" | "slug">): OnThisDayPlayer {
  return { name: player.name, slug: player.slug };
}

function toTournament(
  tournament: Pick<TournamentSummary, "name" | "slug" | "event">,
): OnThisDayTournament {
  const { name, slug, event } = tournament;
  return { name, slug, event: { name: event.name, slug: event.slug } };
}

function toSide(participant: TournamentParticipant, match: Match): OnThisDaySide {
  const result = match.results.find((entry) => entry.participant.id === participant.id);
  return {
    team: participant.team ? toTeam(participant.team) : null,
    players: participant.players.map(toPlayer),
    score: result?.score ?? null,
  };
}

function dated(at: Date) {
  const day = calendarDayIn(at, SITE_TIME_ZONE);
  return { year: day.year, date: formatIsoDay(day) };
}

function title(tournament: Tournament): OnThisDayEvent[] {
  const { winner, endAt } = tournament;
  if (!winner || !endAt || !isRedistributable(tournament.source)) return [];
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
}

function final(match: Match): OnThisDayEvent[] {
  const { winner, endAt, tournament } = match;
  if (!winner || !endAt) return [];
  if (!isRedistributable(match.source) || !isRedistributable(tournament.source)) return [];
  const loser = match.participants.find((participant) => participant.id !== winner.id);
  if (match.participants.length !== 2 || !loser) return [];
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
}

function transfer({ type, date, contract }: Transfer): OnThisDayEvent {
  return {
    kind: "transfer",
    year: date.getUTCFullYear(),
    date: date.toISOString().slice(0, 10),
    type,
    player: toPlayer(contract.player),
    team: toTeam(contract.team),
  };
}

function publicLink(link: NonNullable<OnThisDayFact["link"]>): OnThisDayLink {
  switch (link.kind) {
    case "player":
      return { kind: "player", name: link.name, slug: link.slug };
    case "team":
      return { kind: "team", name: link.name, slug: link.slug };
    case "tournament":
      return {
        kind: "tournament",
        name: link.name,
        slug: link.slug,
        event: { name: link.event.name, slug: link.event.slug },
      };
    case "match":
      return { kind: "match", name: link.name, publicId: link.publicId, slug: link.slug };
    default: {
      const exhaustive: never = link;
      return exhaustive;
    }
  }
}

function fact({ year, textEn, textFr, link, sourceUrl }: OnThisDayFact): OnThisDayEvent[] {
  if (link?.source && !isRedistributable(link.source)) return [];
  return [
    {
      kind: "fact",
      year,
      text: { en: textEn, fr: textFr },
      link: link ? publicLink(link) : null,
      sourceUrl,
    },
  ];
}

function rank(event: OnThisDayEvent): number {
  switch (event.kind) {
    case "fact":
      return 0;
    case "title":
    case "final":
      return 1;
    case "transfer":
      return 2;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

const yearOf = ({ year }: OnThisDayEvent) => year ?? Number.MAX_SAFE_INTEGER;

function byInterest(a: OnThisDayEvent, b: OnThisDayEvent): number {
  return rank(a) - rank(b) || yearOf(b) - yearOf(a);
}

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
      ...finalEvents.flatMap(({ events }) => events),
      ...transfers.filter(({ date }) => date.getUTCFullYear() < on.year).map(transfer),
    ];
    return { date: formatIsoDay(on), events: events.sort(byInterest) };
  }
}
