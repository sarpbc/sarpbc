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

const matchSource = (match: Match): DataSource =>
  isRedistributable(match.source) ? match.tournament.source : match.source;

const matchName = (match: Match): string => {
  const sides = match.participants
    .getItems()
    .map((participant) =>
      participantName({ players: participant.players.getItems(), team: participant.team }),
    );

  return sides.length === 2 ? sides.join(" vs ") : match.name;
};

const toLink = ({ player, team, tournament, match }: OnThisDayFact): StaffFact["link"] => {
  if (player) {
    return { id: player.id, kind: "player", name: player.name, slug: player.slug, source: null };
  }

  if (team) {
    return { id: team.id, kind: "team", name: team.name, slug: team.slug, source: null };
  }

  if (tournament) {
    return {
      event: { name: tournament.event.name, slug: tournament.event.slug },
      id: tournament.id,
      kind: "tournament",
      name: tournament.name,
      slug: tournament.slug,
      source: tournament.source,
    };
  }

  if (match) {
    return {
      id: match.id,
      kind: "match",
      name: matchName(match),
      publicId: match.publicId,
      slug: toMatchSlug(match),
      source: matchSource(match),
    };
  }

  return null;
};

const toFact = (row: OnThisDayFact): StaffFact => ({
  day: row.day,
  id: row.id,
  link: toLink(row),
  month: row.month,
  sourceUrl: row.sourceUrl,
  textEn: row.textEn,
  textFr: row.textFr,
  year: row.year,
});

export class OnThisDayFactPersistence implements OnThisDayFactStore {
  constructor(private readonly em: EntityManager) {}

  async list() {
    const rows = await this.em.find(
      OnThisDayFact,
      {},
      {
        orderBy: [{ month: "ASC" }, { day: "ASC" }, { year: "ASC" }, { createdAt: "ASC" }],
        populate: FACT_POPULATE,
      },
    );

    return rows.map(toFact);
  }

  async onDay(month: number, day: number) {
    const rows = await this.em.find(
      OnThisDayFact,
      { day, month },
      { orderBy: [{ year: "DESC" }, { createdAt: "ASC" }], populate: FACT_POPULATE },
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
      match: matchId !== null && matchId !== "" ? this.em.getReference(Match, matchId) : null,
      player: playerId !== null && playerId !== "" ? this.em.getReference(Player, playerId) : null,
      team: teamId !== null && teamId !== "" ? this.em.getReference(Team, teamId) : null,
      tournament:
        tournamentId !== null && tournamentId !== ""
          ? this.em.getReference(Tournament, tournamentId)
          : null,
    });
    await this.em.persist(row).flush();
  }

  async remove(id: string) {
    return (await this.em.nativeDelete(OnThisDayFact, { id })) > 0;
  }
}
