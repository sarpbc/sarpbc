import { EntityManager } from "@mikro-orm/postgresql";
import {
  SEASON_AWARD_TYPES,
  type PlayerSeasonAward,
  type SeasonAward as SeasonAwardItem,
  type SeasonSummary,
} from "@sarpbc/types";
import { ConflictError } from "../../../common/domain/errors";
import { isUniqueViolation } from "../../../common/infrastructure/persistence/constraint-violation";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import type { SeasonAwardPlayer, SeasonStore } from "../../application/ports";
import type { SeasonAwardFields } from "../../domain/season-award";
import { Season, SeasonAward } from "./season.entities";

function toSummary(row: Season): SeasonSummary {
  return { id: row.id, name: row.name };
}

function toAward(row: SeasonAward): SeasonAwardItem {
  return {
    id: row.id,
    awardType: row.awardType,
    region: row.region,
    presentedBy: row.presentedBy,
    sourceUrl: row.sourceUrl,
    player: { id: row.player.id, name: row.player.name, slug: row.player.slug },
  };
}

function byAwardOrder(a: SeasonAward, b: SeasonAward): number {
  return (
    SEASON_AWARD_TYPES.indexOf(a.awardType) - SEASON_AWARD_TYPES.indexOf(b.awardType) ||
    (a.region ?? "").localeCompare(b.region ?? "")
  );
}

export class SeasonPersistence implements SeasonStore {
  constructor(private readonly em: EntityManager) {}

  async list() {
    const rows = await this.em.find(Season, {}, { orderBy: { createdAt: "DESC", name: "ASC" } });
    return rows.map(toSummary);
  }

  async find(id: string) {
    const row = await this.em.findOne(Season, { id });
    return row ? toSummary(row) : null;
  }

  async nameTaken(name: string, exceptId: string | null) {
    const filter = exceptId ? { name, id: { $ne: exceptId } } : { name };
    return (await this.em.count(Season, filter)) > 0;
  }

  async save(season: SeasonSummary) {
    const row = (await this.em.findOne(Season, { id: season.id })) ?? new Season();
    Object.assign(row, season);
    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictError(`A season named "${season.name}" already exists.`);
      throw error;
    }
  }

  async remove(id: string) {
    return (await this.em.nativeDelete(Season, { id })) > 0;
  }

  async awards(seasonId: string) {
    const rows = await this.em.find(
      SeasonAward,
      { season: { id: seasonId } },
      { populate: ["player"] },
    );
    return rows.sort(byAwardOrder).map(toAward);
  }

  async awardsOfPlayer(playerId: string): Promise<PlayerSeasonAward[]> {
    const rows = await this.em.find(
      SeasonAward,
      { player: { id: playerId } },
      { populate: ["season"] },
    );
    rows.sort((a, b) => b.season.name.localeCompare(a.season.name) || byAwardOrder(a, b));
    return rows.map((row) => ({
      id: row.id,
      awardType: row.awardType,
      region: row.region,
      presentedBy: row.presentedBy,
      sourceUrl: row.sourceUrl,
      season: toSummary(row.season),
    }));
  }

  async player(id: string): Promise<SeasonAwardPlayer | null> {
    const row = await this.em.findOne(Player, { id }, { populate: ["mergedInto"] });
    return row ? { id: row.id, name: row.name, mergedIntoId: row.mergedInto?.id ?? null } : null;
  }

  async awardTaken(seasonId: string, award: Pick<SeasonAwardFields, "awardType" | "region">) {
    return (
      (await this.em.count(SeasonAward, {
        season: { id: seasonId },
        awardType: award.awardType,
        region: award.region,
      })) > 0
    );
  }

  async saveAward(seasonId: string, playerId: string, award: SeasonAwardFields) {
    const row = Object.assign(new SeasonAward(), {
      ...award,
      season: await this.em.findOneOrFail(Season, { id: seasonId }),
      player: await this.em.findOneOrFail(Player, { id: playerId }),
    });
    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictError(
          `${row.season.name} already has this award. Remove the current award before assigning another player.`,
        );
      throw error;
    }
    return toAward(row);
  }

  async removeAward(seasonId: string, awardId: string) {
    const removed = await this.em.nativeDelete(SeasonAward, {
      id: awardId,
      season: { id: seasonId },
    });
    return removed > 0;
  }
}
