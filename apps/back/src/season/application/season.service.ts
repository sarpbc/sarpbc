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
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { SEASON_AWARD_LABELS, parseSeasonAward } from "../domain/season-award";
import type { SeasonStore } from "./ports";

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > SEASON_NAME_MAX_LENGTH)
    throw new InvalidInputError(
      `A season name has between 1 and ${SEASON_NAME_MAX_LENGTH} characters.`,
    );
  return trimmed;
}

export class SeasonService {
  constructor(private readonly store: SeasonStore) {}

  list(): Promise<SeasonSummary[]> {
    return this.store.list();
  }

  async detail(id: string): Promise<SeasonDetail> {
    const season = await this.require(id);
    return { ...season, awards: await this.store.awards(season.id) };
  }

  async create(input: SeasonInput): Promise<SeasonSummary> {
    const season: SeasonSummary = { id: v4(), name: await this.freeName(input.name, null) };
    await this.store.save(season);
    return season;
  }

  async update(id: string, input: SeasonInput): Promise<SeasonSummary> {
    const current = await this.require(id);
    const season: SeasonSummary = { ...current, name: await this.freeName(input.name, id) };
    await this.store.save(season);
    return season;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.store.remove(id))) throw new NotFoundError("Season not found");
  }

  awardsOfPlayer(playerId: string): Promise<PlayerSeasonAward[]> {
    return this.store.awardsOfPlayer(playerId);
  }

  async requireAward(seasonId: string, input: SeasonAwardInput) {
    const season = await this.require(seasonId);
    const award = parseSeasonAward(input);
    const player = await this.store.player(input.playerId);
    if (!player) throw new NotFoundError(`Player with id "${input.playerId}" not found`);
    if (player.mergedIntoId)
      throw new InvalidInputError(
        `Player "${player.id}" was merged into "${player.mergedIntoId}"; use that id`,
      );
    if (await this.store.awardTaken(season.id, award))
      throw new ConflictError(
        `${season.name} already has a ${SEASON_AWARD_LABELS[award.awardType]}` +
          (award.region ? ` for ${award.region}` : "") +
          ". Remove the current award before assigning another player.",
      );
    return award;
  }

  async addAward(seasonId: string, input: SeasonAwardInput): Promise<SeasonAward> {
    const award = await this.requireAward(seasonId, input);
    return this.store.saveAward(seasonId, input.playerId, award);
  }

  async removeAward(seasonId: string, awardId: string): Promise<void> {
    if (!(await this.store.removeAward(seasonId, awardId)))
      throw new NotFoundError(`Award with id "${awardId}" was not found for season "${seasonId}"`);
  }

  private async require(id: string): Promise<SeasonSummary> {
    const season = await this.store.find(id);
    if (!season) throw new NotFoundError("Season not found");
    return season;
  }

  private async freeName(raw: string, exceptId: string | null): Promise<string> {
    const name = cleanName(raw);
    if (await this.store.nameTaken(name, exceptId))
      throw new ConflictError(`A season named "${name}" already exists.`);
    return name;
  }
}
