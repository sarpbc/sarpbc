import type {
  CircuitDetail,
  CircuitInput,
  CircuitStageScaleInput,
  CircuitEventTeam,
  CircuitStandings,
  CircuitSummary,
} from "@sarpbc/types";
import {
  CIRCUIT_DESCRIPTION_MAX_LENGTH,
  CIRCUIT_NAME_MAX_LENGTH,
  CIRCUIT_REGION_MAX_LENGTH,
  MAX_CIRCUIT_QUALIFICATION_SPOTS,
  MAX_CIRCUIT_SEASON,
  MIN_CIRCUIT_SEASON,
  toSlug,
} from "@sarpbc/utils";
import { v4 } from "uuid";
import { isUuid } from "../../common/domain/entity-ref";
import { isRedistributable } from "../../common/domain/data-source";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { assertCircuitSourceUrl, parseCircuitStageSettings } from "../domain/circuit-scale";
import type { CircuitStageSettings } from "../domain/circuit-scale";
import { computeCircuitStandings } from "../domain/circuit-standings";
import type { CircuitStore } from "./ports";

function cleanName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed || trimmed.length > CIRCUIT_NAME_MAX_LENGTH) {
    throw new InvalidInputError(
      `A circuit name has between 1 and ${CIRCUIT_NAME_MAX_LENGTH} characters.`,
    );
  }

  return trimmed;
}

function cleanDescription(description: string | null | undefined): string | null {
  const trimmed = description?.trim() ?? "";

  if (trimmed.length > CIRCUIT_DESCRIPTION_MAX_LENGTH) {
    throw new InvalidInputError(
      `A circuit description has at most ${CIRCUIT_DESCRIPTION_MAX_LENGTH} characters.`,
    );
  }

  return trimmed || null;
}

function cleanSpots(spots: number | null | undefined): number | null {
  if (spots === null || spots === undefined) {
    return null;
  }

  if (!Number.isInteger(spots) || spots < 1 || spots > MAX_CIRCUIT_QUALIFICATION_SPOTS) {
    throw new InvalidInputError(
      `Qualification spots must be a whole number from 1 to ${MAX_CIRCUIT_QUALIFICATION_SPOTS}.`,
    );
  }

  return spots;
}

function cleanSeason(season: number): number {
  if (!Number.isInteger(season) || season < MIN_CIRCUIT_SEASON || season > MAX_CIRCUIT_SEASON) {
    throw new InvalidInputError(
      `A circuit season is a year from ${MIN_CIRCUIT_SEASON} to ${MAX_CIRCUIT_SEASON}.`,
    );
  }

  return season;
}

function cleanRegion(region: string | null | undefined): string | null {
  const trimmed = region?.trim() ?? "";

  if (trimmed.length > CIRCUIT_REGION_MAX_LENGTH) {
    throw new InvalidInputError(
      `A circuit region has at most ${CIRCUIT_REGION_MAX_LENGTH} characters.`,
    );
  }

  return trimmed || null;
}

function cleanSourceUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim();
  assertCircuitSourceUrl(trimmed);

  return trimmed;
}

function key(value: string | null): string | null {
  return value?.toLocaleLowerCase("en-US") ?? null;
}

export class CircuitService {
  constructor(
    private readonly store: CircuitStore,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async list(): Promise<CircuitSummary[]> {
    return await this.store.list();
  }

  async detail(idOrSlug: string): Promise<CircuitDetail> {
    const circuit = await this.require(idOrSlug);

    return { ...circuit, stages: await this.store.stages(circuit.id) };
  }

  async standings(idOrSlug: string): Promise<CircuitStandings> {
    const circuit = await this.require(idOrSlug);

    const stageResults = await this.store.stageResults(circuit.id);
    const results = stageResults.filter(({ source }) => isRedistributable(source));

    return { ...circuit, ...computeCircuitStandings(results, circuit.region, this.clock()) };
  }

  async create(input: CircuitInput): Promise<CircuitSummary> {
    const circuit: CircuitSummary = {
      id: v4(),
      name: cleanName(input.name),
      slug: "",
      season: cleanSeason(input.season),
      region: cleanRegion(input.region),
      description: cleanDescription(input.description),
      sourceUrl: cleanSourceUrl(input.sourceUrl),
      qualificationSpots: cleanSpots(input.qualificationSpots),
    };

    circuit.slug = await this.freeSlug(input.slug ?? circuit.name, circuit.id);
    await this.assertUnique(circuit);
    await this.store.save(circuit);

    return circuit;
  }

  async update(idOrSlug: string, input: Partial<CircuitInput>): Promise<CircuitSummary> {
    const current = await this.require(idOrSlug);

    const circuit: CircuitSummary = {
      ...current,
      name: input.name === undefined ? current.name : cleanName(input.name),
      season: input.season === undefined ? current.season : cleanSeason(input.season),
      region: input.region === undefined ? current.region : cleanRegion(input.region),
      description:
        input.description === undefined ? current.description : cleanDescription(input.description),
      sourceUrl:
        input.sourceUrl === undefined ? current.sourceUrl : cleanSourceUrl(input.sourceUrl),
      qualificationSpots:
        input.qualificationSpots === undefined
          ? current.qualificationSpots
          : cleanSpots(input.qualificationSpots),
    };

    if (input.slug !== undefined) {
      circuit.slug = await this.freeSlug(input.slug, circuit.id);
    }

    await this.assertUnique(circuit);
    await this.store.save(circuit);

    return circuit;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.store.remove(id))) {
      throw new NotFoundError("Circuit not found");
    }
  }

  async stageTeams(circuitId: string, tournamentId: string): Promise<CircuitEventTeam[]> {
    await this.require(circuitId);

    return await this.requireEventTeams(tournamentId);
  }

  async requireStageSettings(
    circuitId: string,
    tournamentId: string,
    input: CircuitStageScaleInput,
  ): Promise<CircuitStageSettings> {
    await this.require(circuitId);
    const teams = await this.requireEventTeams(tournamentId);

    return parseCircuitStageSettings(input, new Set(teams.map(({ team }) => team.id)));
  }

  async setStageScale(
    circuitId: string,
    tournamentId: string,
    input: CircuitStageScaleInput,
  ): Promise<void> {
    const settings = await this.requireStageSettings(circuitId, tournamentId, input);
    await this.store.saveStage(circuitId, tournamentId, settings);
  }

  async removeStage(circuitId: string, tournamentId: string): Promise<void> {
    if (!(await this.store.removeStage(circuitId, tournamentId))) {
      throw new NotFoundError("This tournament is not part of the circuit.");
    }
  }

  private async requireEventTeams(tournamentId: string): Promise<CircuitEventTeam[]> {
    const teams = await this.store.eventTeams(tournamentId);

    if (teams === null) {
      throw new NotFoundError(`Tournament with id "${tournamentId}" was not found.`);
    }

    return teams;
  }

  private async require(idOrSlug: string): Promise<CircuitSummary> {
    const circuit = await this.store.find(idOrSlug);

    if (!circuit) {
      throw new NotFoundError("Circuit not found");
    }

    return circuit;
  }

  private async assertUnique({ id, name, season, region }: CircuitSummary): Promise<void> {
    const twins = await this.store.withSeason(season);

    if (
      twins.some(
        (other) =>
          other.id !== id && key(other.name) === key(name) && key(other.region) === key(region),
      )
    ) {
      throw new ConflictError(
        `A circuit named "${name}" already exists for this season and region.`,
      );
    }
  }

  private async freeSlug(raw: string, id: string): Promise<string> {
    const slug = toSlug(raw);

    if (!slug || isUuid(slug)) {
      throw new InvalidInputError(
        "Enter a valid slug using letters, numbers, and hyphens (e.g. season-2026).",
      );
    }

    if (await this.store.slugTaken(slug, id)) {
      throw new ConflictError(`A circuit with the slug "${slug}" already exists.`);
    }

    return slug;
  }
}
