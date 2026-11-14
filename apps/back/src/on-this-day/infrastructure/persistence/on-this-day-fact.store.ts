import { EntityManager } from "@mikro-orm/postgresql";
import type { DataSource, OnThisDayFactLinkInput } from "@sarpbc/types";
import { participantName } from "@sarpbc/utils";
import { isRedistributable } from "../../../common/domain/data-source";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import {
  Match,
  Tournament,
  toMatchSlug,
} from "../../../tournament/infrastructure/competition-persistence";
import type { OnThisDayFactStore, StaffFact } from "../../application/ports";
import type { OnThisDayFactFields } from "../../domain/on-this-day-fact";
import { OnThisDayFact } from "./on-this-day-fact.entities";

const FACT_POPULATE = [
  "player",
  "team",
  "tournament.event",
  "match.tournament.event",
  "match.participants.team",
  "match.participants.players",
] as const;

function matchSource(match: Match): DataSource {
  return isRedistributable(match.source) ? match.tournament.source : match.source;
}

function matchName(match: Match): string {
  const sides = match.participants
    .getItems()
    .map((participant) =>
      participantName({ team: participant.team, players: participant.players.getItems() }),
    );

  return sides.length === 2 ? sides.join(" vs ") : match.name;
}

function toLink({ player, team, tournament, match }: OnThisDayFact): StaffFact["link"] {
  if (player) {
    return { kind: "player", id: player.id, name: player.name, slug: player.slug, source: null };
  }

  if (team) {
    return { kind: "team", id: team.id, name: team.name, slug: team.slug, source: null };
  }

  if (tournament) {
    return {
      kind: "tournament",
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      event: { name: tournament.event.name, slug: tournament.event.slug },
      source: tournament.source,
    };
  }

  if (match) {
    return {
      kind: "match",
      id: match.id,
      name: matchName(match),
      publicId: match.publicId,
      slug: toMatchSlug(match),
      source: matchSource(match),
    };
  }

  return null;
}

function toFact(row: OnThisDayFact): StaffFact {
  return {
    id: row.id,
    month: row.month,
    day: row.day,
    year: row.year,
    textEn: row.textEn,
    textFr: row.textFr,
    link: toLink(row),
    sourceUrl: row.sourceUrl,
  };
}

export class OnThisDayFactPersistence implements OnThisDayFactStore {
  constructor(private readonly em: EntityManager) {}

  async list() {
    const rows = await this.em.find(
      OnThisDayFact,
      {},
      {
        populate: FACT_POPULATE,
        orderBy: { month: "ASC", day: "ASC", year: "ASC", createdAt: "ASC" },
      },
    );

    return rows.map(toFact);
  }

  async onDay(month: number, day: number) {
    const rows = await this.em.find(
      OnThisDayFact,
      { month, day },
      { populate: FACT_POPULATE, orderBy: { year: "DESC", createdAt: "ASC" } },
    );

    return rows.map(toFact);
  }

  async find(id: string) {
    const row = await this.em.findOne(OnThisDayFact, { id }, { populate: FACT_POPULATE });

    return row ? toFact(row) : null;
  }

  async linkExists({ kind, id }: OnThisDayFactLinkInput) {
    switch (kind) {
      case "player": {
        return (await this.em.count(Player, { id, mergedInto: null })) > 0;
      }

      case "team": {
        return (await this.em.count(Team, { id, mergedInto: null })) > 0;
      }

      case "tournament": {
        return (await this.em.count(Tournament, { id })) > 0;
      }

      case "match": {
        return (await this.em.count(Match, { id })) > 0;
      }

      default: {
        const exhaustive: never = kind;

        return exhaustive;
      }
    }
  }

  async save(id: string, { link, ...fields }: OnThisDayFactFields) {
    const row = (await this.em.findOne(OnThisDayFact, { id })) ?? new OnThisDayFact();
    const linked = (kind: OnThisDayFactLinkInput["kind"]) => (link?.kind === kind ? link.id : null);
    const playerId = linked("player");
    const teamId = linked("team");
    const tournamentId = linked("tournament");
    const matchId = linked("match");
    Object.assign(row, {
      id,
      ...fields,
      player: playerId !== null && playerId !== "" ? this.em.getReference(Player, playerId) : null,
      team: teamId !== null && teamId !== "" ? this.em.getReference(Team, teamId) : null,
      tournament:
        tournamentId !== null && tournamentId !== ""
          ? this.em.getReference(Tournament, tournamentId)
          : null,
      match: matchId !== null && matchId !== "" ? this.em.getReference(Match, matchId) : null,
    });
    await this.em.persist(row).flush();
  }

  async remove(id: string) {
    return (await this.em.nativeDelete(OnThisDayFact, { id })) > 0;
  }
}
