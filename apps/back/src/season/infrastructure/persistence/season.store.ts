import { EntityManager } from "@mikro-orm/postgresql";
import {
  SEASON_AWARD_TYPES,
  type PlayerSeasonAward,
  type SeasonArchiveSummary,
  type SeasonAward as SeasonAwardItem,
  type SeasonParticipant as SeasonParticipantItem,
  type SeasonPathEntry as SeasonPathEntryItem,
  type SeasonSummary,
  type SeasonTeam,
} from "@sarpbc/types";
import { ConflictError } from "../../../common/domain/errors";
import { isUniqueViolation } from "../../../common/infrastructure/persistence/constraint-violation";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "../../../tournament/infrastructure/competition-persistence";
import type {
  SeasonAwardPlayer,
  SeasonParticipantTeam,
  SeasonRecord,
  SeasonStore,
} from "../../application/ports";
import type { SeasonPathEntryFields } from "../../domain/season-archive";
import type { SeasonAwardFields } from "../../domain/season-award";
import { Season, SeasonAward, SeasonParticipant, SeasonPathEntry } from "./season.entities";

function toSummary(row: Season): SeasonSummary {
  return { id: row.id, name: row.name, slug: row.slug };
}

function toRecord(row: Season): SeasonRecord {
  return {
    ...toSummary(row),
    format: { summary: row.formatSummary, phases: row.formatPhases },
    winnerTeamId: row.winnerTeam?.id ?? null,
  };
}

function toTeam(row: Team): SeasonTeam {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.imageUrl,
    darkModeImageUrl: row.darkModeImageUrl,
  };
}

function toPathEntry(row: SeasonPathEntry): SeasonPathEntryItem {
  const { tournament } = row;
  return {
    id: row.id,
    label: row.label,
    result: row.result,
    tournament: tournament
      ? {
          id: tournament.id,
          name: tournament.name,
          slug: tournament.slug,
          source: tournament.source,
          event: {
            id: tournament.event.id,
            slug: tournament.event.slug,
            name: tournament.event.name,
          },
        }
      : null,
  };
}

function byCreation(a: { createdAt: Date; id: string }, b: { createdAt: Date; id: string }) {
  return a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
}

function toParticipant(row: SeasonParticipant): SeasonParticipantItem {
  return {
    id: row.id,
    team: toTeam(row.team),
    pathNote: row.pathNote,
    path: row.path.getItems().sort(byCreation).map(toPathEntry),
  };
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

const PARTICIPANT_POPULATE = ["team", "path.tournament.event"] as const;

export class SeasonPersistence implements SeasonStore {
  constructor(private readonly em: EntityManager) {}

  async list() {
    const rows = await this.em.find(Season, {}, { orderBy: { createdAt: "DESC", name: "ASC" } });
    return rows.map(toSummary);
  }

  async published(): Promise<SeasonArchiveSummary[]> {
    const rows = await this.em.find(
      Season,
      { slug: { $ne: null } },
      { populate: ["winnerTeam"], orderBy: { createdAt: "DESC", name: "ASC" } },
    );
    return rows.flatMap(({ slug, name, winnerTeam }) =>
      slug ? [{ slug, name, winner: winnerTeam ? toTeam(winnerTeam) : null }] : [],
    );
  }

  async find(id: string) {
    const row = await this.em.findOne(Season, { id });
    return row ? toRecord(row) : null;
  }

  async findBySlug(slug: string) {
    const row = await this.em.findOne(Season, { slug });
    return row ? toRecord(row) : null;
  }

  async nameTaken(name: string, exceptId: string | null) {
    const filter = exceptId ? { name, id: { $ne: exceptId } } : { name };
    return (await this.em.count(Season, filter)) > 0;
  }

  async slugTaken(slug: string, exceptId: string | null) {
    const filter = exceptId ? { slug, id: { $ne: exceptId } } : { slug };
    return (await this.em.count(Season, filter)) > 0;
  }

  async save(season: SeasonRecord) {
    const row = (await this.em.findOne(Season, { id: season.id })) ?? new Season();
    Object.assign(row, {
      id: season.id,
      name: season.name,
      slug: season.slug,
      formatSummary: season.format.summary,
      formatPhases: season.format.phases,
      winnerTeam: season.winnerTeamId ? this.em.getReference(Team, season.winnerTeamId) : null,
    });
    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictError(
          `Another season already uses the name "${season.name}"` +
            (season.slug ? ` or the slug "${season.slug}".` : "."),
        );
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

  async team(id: string): Promise<SeasonParticipantTeam | null> {
    const row = await this.em.findOne(Team, { id }, { populate: ["mergedInto"] });
    return row ? { id: row.id, name: row.name, mergedIntoId: row.mergedInto?.id ?? null } : null;
  }

  async tournamentExists(id: string) {
    return (await this.em.count(Tournament, { id })) > 0;
  }

  async participants(seasonId: string) {
    const rows = await this.em.find(
      SeasonParticipant,
      { season: { id: seasonId } },
      { populate: PARTICIPANT_POPULATE, orderBy: { team: { name: "ASC" } } },
    );
    return rows.map(toParticipant);
  }

  async participant(seasonId: string, participantId: string) {
    const row = await this.em.findOne(
      SeasonParticipant,
      { id: participantId, season: { id: seasonId } },
      { populate: PARTICIPANT_POPULATE },
    );
    return row ? toParticipant(row) : null;
  }

  async participantTaken(seasonId: string, teamId: string) {
    return (
      (await this.em.count(SeasonParticipant, { season: { id: seasonId }, team: { id: teamId } })) >
      0
    );
  }

  async saveParticipant(seasonId: string, teamId: string, pathNote: string | null) {
    const row = Object.assign(new SeasonParticipant(), {
      season: this.em.getReference(Season, seasonId),
      team: await this.em.findOneOrFail(Team, { id: teamId }),
      pathNote,
    });
    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictError(`${row.team.name} already takes part in this season.`);
      throw error;
    }
    return toParticipant(row);
  }

  async updatePathNote(participantId: string, pathNote: string | null) {
    await this.em.nativeUpdate(SeasonParticipant, { id: participantId }, { pathNote });
  }

  async removeParticipant(seasonId: string, participantId: string) {
    const removed = await this.em.nativeDelete(SeasonParticipant, {
      id: participantId,
      season: { id: seasonId },
    });
    return removed > 0;
  }

  async savePathEntry(participantId: string, entry: SeasonPathEntryFields) {
    const row = Object.assign(new SeasonPathEntry(), {
      participant: this.em.getReference(SeasonParticipant, participantId),
      label: entry.label,
      result: entry.result,
      tournament: entry.tournamentId
        ? await this.em.findOneOrFail(
            Tournament,
            { id: entry.tournamentId },
            { populate: ["event"] },
          )
        : null,
    });
    await this.em.persist(row).flush();
    return toPathEntry(row);
  }

  async removePathEntry(participantId: string, entryId: string) {
    const removed = await this.em.nativeDelete(SeasonPathEntry, {
      id: entryId,
      participant: { id: participantId },
    });
    return removed > 0;
  }
}
