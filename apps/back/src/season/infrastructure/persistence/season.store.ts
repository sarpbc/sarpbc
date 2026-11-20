import type {
  PlayerSeasonAward,
  SeasonArchiveSummary,
  SeasonAward as SeasonAwardItem,
  SeasonParticipant as SeasonParticipantItem,
  SeasonPathEntry as SeasonPathEntryItem,
  SeasonSummary,
  SeasonTeam,
} from "@sarpbc/types";
import { EntityManager } from "@mikro-orm/postgresql";
import { SEASON_AWARD_TYPES } from "@sarpbc/types";
import { ConflictError } from "../../../common/domain/errors/conflict-error";
import { isUniqueViolation } from "../../../common/infrastructure/persistence/constraint-violation";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "../../../tournament/infrastructure/competition-persistence";
import type { SeasonRecord, SeasonStore } from "../../application/ports";
import type { SeasonPathEntryFields } from "../../domain/season-archive";
import type { SeasonAwardFields } from "../../domain/season-award";
import { Season } from "./season.entity";
import { SeasonAward } from "./season-award.entity";
import { SeasonParticipant } from "./season-participant.entity";
import { SeasonPathEntry } from "./season-path-entry.entity";

const toSummary = (row: Season) =>
  ({ id: row.id, name: row.name, slug: row.slug }) satisfies SeasonSummary;

const toRecord = (row: Season) => ({
  ...toSummary(row),
  format: { phases: row.formatPhases, summary: row.formatSummary },
  winnerTeamId: row.winnerTeam?.id ?? null,
});

const toTeam = (row: Team) =>
  ({
    darkModeImageUrl: row.darkModeImageUrl,
    id: row.id,
    imageUrl: row.imageUrl,
    name: row.name,
    slug: row.slug,
  }) satisfies SeasonTeam;

const toPathEntry = (row: SeasonPathEntry) => {
  const { tournament } = row;

  return {
    id: row.id,
    label: row.label,
    result: row.result,
    tournament: tournament
      ? {
          event: {
            id: tournament.event.id,
            name: tournament.event.name,
            slug: tournament.event.slug,
          },
          id: tournament.id,
          name: tournament.name,
          slug: tournament.slug,
        }
      : null,
  } satisfies SeasonPathEntryItem;
};

const byCreation = (a: { createdAt: Date; id: string }, b: { createdAt: Date; id: string }) =>
  a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);

const toParticipant = (row: SeasonParticipant) =>
  ({
    id: row.id,
    path: row.path.getItems().toSorted(byCreation).map(toPathEntry),
    pathNote: row.pathNote,
    team: toTeam(row.team),
  }) satisfies SeasonParticipantItem;

const toAward = (row: SeasonAward) =>
  ({
    awardType: row.awardType,
    id: row.id,
    player: { id: row.player.id, name: row.player.name, slug: row.player.slug },
    presentedBy: row.presentedBy,
    region: row.region,
    sourceUrl: row.sourceUrl,
  }) satisfies SeasonAwardItem;

const byAwardOrder = (a: SeasonAward, b: SeasonAward) =>
  SEASON_AWARD_TYPES.indexOf(a.awardType) - SEASON_AWARD_TYPES.indexOf(b.awardType) ||
  (a.region ?? "").localeCompare(b.region ?? "");

const PARTICIPANT_POPULATE = ["team", "path.tournament.event"] as const;

export class SeasonPersistence implements SeasonStore {
  constructor(private readonly em: EntityManager) {}

  async list() {
    const rows = await this.em.find(Season, {}, { orderBy: { createdAt: "DESC", name: "ASC" } });

    return rows.map(toSummary);
  }

  async published() {
    const rows = await this.em.find(
      Season,
      { slug: { $ne: null } },
      { orderBy: { createdAt: "DESC", name: "ASC" }, populate: ["winnerTeam"] },
    );

    return rows.flatMap(({ slug, name, winnerTeam }) =>
      slug !== null && slug !== ""
        ? [{ name, slug, winner: winnerTeam ? toTeam(winnerTeam) : null }]
        : [],
    ) satisfies SeasonArchiveSummary[];
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
    const filter =
      exceptId !== null && exceptId !== "" ? { id: { $ne: exceptId }, name } : { name };

    return (await this.em.count(Season, filter)) > 0;
  }

  async slugTaken(slug: string, exceptId: string | null) {
    const filter =
      exceptId !== null && exceptId !== "" ? { id: { $ne: exceptId }, slug } : { slug };

    return (await this.em.count(Season, filter)) > 0;
  }

  async save(season: SeasonRecord) {
    const row = (await this.em.findOne(Season, { id: season.id })) ?? new Season();
    Object.assign(row, {
      formatPhases: season.format.phases,
      formatSummary: season.format.summary,
      id: season.id,
      name: season.name,
      slug: season.slug,
      winnerTeam:
        season.winnerTeamId !== null && season.winnerTeamId !== ""
          ? this.em.getReference(Team, season.winnerTeamId)
          : null,
    });

    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `Another season already uses the name "${season.name}"${
            season.slug !== null && season.slug !== "" ? ` or the slug "${season.slug}".` : "."
          }`,
        );
      }

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

    return rows.toSorted(byAwardOrder).map(toAward);
  }

  async awardsOfPlayer(playerId: string) {
    const rows = await this.em.find(
      SeasonAward,
      { player: { id: playerId } },
      { populate: ["season"] },
    );

    const sorted = rows.toSorted(
      (a, b) => b.season.name.localeCompare(a.season.name) || byAwardOrder(a, b),
    );

    return sorted.map((row) => ({
      awardType: row.awardType,
      id: row.id,
      presentedBy: row.presentedBy,
      region: row.region,
      season: toSummary(row.season),
      sourceUrl: row.sourceUrl,
    })) satisfies PlayerSeasonAward[];
  }

  async player(id: string) {
    const row = await this.em.findOne(Player, { id }, { populate: ["mergedInto"] });

    return row ? { id: row.id, mergedIntoId: row.mergedInto?.id ?? null, name: row.name } : null;
  }

  async awardTaken(seasonId: string, award: Pick<SeasonAwardFields, "awardType" | "region">) {
    return (
      (await this.em.count(SeasonAward, {
        awardType: award.awardType,
        region: award.region,
        season: { id: seasonId },
      })) > 0
    );
  }

  async saveAward(seasonId: string, playerId: string, award: SeasonAwardFields) {
    const season = await this.em.findOneOrFail(Season, { id: seasonId });
    const player = await this.em.findOneOrFail(Player, { id: playerId });
    const row = Object.assign(new SeasonAward(), { ...award, player, season });

    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `${row.season.name} already has this award. Remove the current award before assigning another player.`,
        );
      }

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

  async team(id: string) {
    const row = await this.em.findOne(Team, { id }, { populate: ["mergedInto"] });

    return row ? { id: row.id, mergedIntoId: row.mergedInto?.id ?? null, name: row.name } : null;
  }

  async tournamentExists(id: string) {
    return (await this.em.count(Tournament, { id })) > 0;
  }

  async participants(seasonId: string) {
    const rows = await this.em.find(
      SeasonParticipant,
      { season: { id: seasonId } },
      { orderBy: { team: { name: "ASC" } }, populate: PARTICIPANT_POPULATE },
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
      pathNote,
      season: this.em.getReference(Season, seasonId),
      team: await this.em.findOneOrFail(Team, { id: teamId }),
    });

    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(`${row.team.name} already takes part in this season.`);
      }

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
      label: entry.label,
      participant: this.em.getReference(SeasonParticipant, participantId),
      result: entry.result,
      tournament:
        entry.tournamentId !== null && entry.tournamentId !== ""
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
