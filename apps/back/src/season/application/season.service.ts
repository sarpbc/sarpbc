import type {
  PlayerSeasonAward,
  SeasonAward,
  SeasonAwardInput,
  SeasonDetail,
  SeasonInput,
  SeasonSummary,
} from "@sarpbc/types";
import { SEASON_NAME_MAX_LENGTH } from "@sarpbc/utils";
import { v4 } from "uuid";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { EMPTY_SEASON_FORMAT, parseSeasonFormat, parseSeasonSlug } from "../domain/season-archive";
import { SEASON_AWARD_LABELS, parseSeasonAward } from "../domain/season-award";
import type { SeasonRecord, SeasonStore } from "./ports";

const cleanName = (name: string): string => {
  const trimmed = name.trim();

  if (!trimmed || trimmed.length > SEASON_NAME_MAX_LENGTH) {
    throw new InvalidInputError(
      `A season name has between 1 and ${SEASON_NAME_MAX_LENGTH} characters.`,
    );
  }

  return trimmed;
};

export class SeasonService {
  constructor(private readonly store: SeasonStore) {}

  async list(): Promise<SeasonSummary[]> {
    return await this.store.list();
  }

  async detail(id: string): Promise<SeasonDetail> {
    const season = await this.require(id);
    const participants = await this.store.participants(season.id);

    return { ...season, participants, awards: await this.store.awards(season.id) };
  }

  async create(input: SeasonInput): Promise<SeasonDetail> {
    if (
      input.winnerTeamId !== null &&
      input.winnerTeamId !== undefined &&
      input.winnerTeamId !== ""
    ) {
      throw new InvalidInputError("Add the winning team as a participant before naming it.");
    }

    const season: SeasonRecord = {
      id: v4(),
      name: await this.freeName(input.name, null),
      slug: await this.freeSlug(input.slug ?? null, null),
      format: input.format ? parseSeasonFormat(input.format) : EMPTY_SEASON_FORMAT,
      winnerTeamId: null,
    };

    await this.store.save(season);

    return await this.detail(season.id);
  }

  async update(id: string, input: SeasonInput): Promise<SeasonDetail> {
    const current = await this.require(id);

    const season: SeasonRecord = {
      ...current,
      name: await this.freeName(input.name, id),
      slug: input.slug === undefined ? current.slug : await this.freeSlug(input.slug, id),
      format: input.format ? parseSeasonFormat(input.format) : current.format,
      winnerTeamId:
        input.winnerTeamId === undefined
          ? current.winnerTeamId
          : await this.participantTeam(id, input.winnerTeamId),
    };

    await this.store.save(season);

    return await this.detail(id);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.store.remove(id))) {
      throw new NotFoundError("Season not found");
    }
  }

  async awardsOfPlayer(playerId: string): Promise<PlayerSeasonAward[]> {
    return await this.store.awardsOfPlayer(playerId);
  }

  async requireAward(seasonId: string, input: SeasonAwardInput) {
    const season = await this.require(seasonId);
    const award = parseSeasonAward(input);
    const player = await this.store.player(input.playerId);

    if (!player) {
      throw new NotFoundError(`Player with id "${input.playerId}" not found`);
    }

    if (player.mergedIntoId !== null && player.mergedIntoId !== "") {
      throw new InvalidInputError(
        `Player "${player.id}" was merged into "${player.mergedIntoId}"; use that id`,
      );
    }

    if (await this.store.awardTaken(season.id, award)) {
      throw new ConflictError(
        `${season.name} already has a ${SEASON_AWARD_LABELS[award.awardType]}${
          award.region !== null && award.region !== "" ? ` for ${award.region}` : ""
        }. Remove the current award before assigning another player.`,
      );
    }

    return award;
  }

  async addAward(seasonId: string, input: SeasonAwardInput): Promise<SeasonAward> {
    const award = await this.requireAward(seasonId, input);

    return await this.store.saveAward(seasonId, input.playerId, award);
  }

  async removeAward(seasonId: string, awardId: string): Promise<void> {
    if (!(await this.store.removeAward(seasonId, awardId))) {
      throw new NotFoundError(`Award with id "${awardId}" was not found for season "${seasonId}"`);
    }
  }

  private async require(id: string): Promise<SeasonRecord> {
    const season = await this.store.find(id);

    if (!season) {
      throw new NotFoundError("Season not found");
    }

    return season;
  }

  private async freeName(raw: string, exceptId: string | null): Promise<string> {
    const name = cleanName(raw);

    if (await this.store.nameTaken(name, exceptId)) {
      throw new ConflictError(`A season named "${name}" already exists.`);
    }

    return name;
  }

  private async freeSlug(raw: string | null, exceptId: string | null): Promise<string | null> {
    const slug = parseSeasonSlug(raw);

    if (slug !== null && (await this.store.slugTaken(slug, exceptId))) {
      throw new ConflictError(`A season with the slug "${slug}" already exists.`);
    }

    return slug;
  }

  private async participantTeam(seasonId: string, teamId: string | null): Promise<string | null> {
    if (teamId === null) {
      return null;
    }

    if (!(await this.store.participantTaken(seasonId, teamId))) {
      throw new InvalidInputError("The winner must be one of the season's participants.");
    }

    return teamId;
  }
}
