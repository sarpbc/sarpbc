import { EntityManager } from "@mikro-orm/postgresql";
import type {
  CircuitDetail,
  CircuitEventTeam,
  CircuitStandingTeam,
  CircuitSummary,
  TournamentEventRef,
} from "@sarpbc/types";
import { isUuid } from "../../../common/domain/entity-ref";
import { ConflictError } from "../../../common/domain/errors/conflict-error";
import { isUniqueViolation } from "../../../common/infrastructure/persistence/constraint-violation";
import { Team } from "../../../roster/infrastructure/roster-persistence";
import {
  Tournament,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type { CircuitStore, StoredStageResult } from "../../application/ports";
import type { CircuitStageSettings } from "../../domain/circuit-scale";
import type { StagePlacement } from "../../domain/circuit-standings";
import { Circuit } from "./circuit.entity";
import { CircuitStage } from "./circuit-stage.entity";
import { CircuitStageTeam } from "./circuit-stage-team.entity";

const toSummary = (row: Circuit): CircuitSummary => ({
  description: row.description,
  id: row.id,
  name: row.name,
  qualificationSpots: row.qualificationSpots,
  region: row.region,
  season: row.season,
  slug: row.slug,
  sourceUrl: row.sourceUrl,
});

const eventRef = ({ event }: Tournament): TournamentEventRef => ({
  id: event.id,
  name: event.name,
  slug: event.slug,
});

const toTeam = (team: Team): CircuitStandingTeam => ({
  darkModeImageUrl: team.darkModeImageUrl,
  id: team.id,
  imageUrl: team.imageUrl,
  name: team.name,
  slug: team.slug,
});

const regionTeams = (stage: CircuitStage): Team[] =>
  stage.teams
    .getItems()
    .filter(({ regionMember }) => regionMember)
    .map(({ team }) => team)
    .toSorted((a, b) => a.name.localeCompare(b.name));

const finishes = (stage: CircuitStage): StagePlacement[] =>
  stage.teams
    .getItems()
    .flatMap(({ team, placement }) =>
      placement === null ? [] : [{ placement, team: toTeam(team) }],
    )
    .toSorted((a, b) => a.placement - b.placement || a.team.name.localeCompare(b.team.name));

const toStageItem = (stage: CircuitStage): CircuitDetail["stages"][number] => {
  const { tournament, scale, sourceUrl, worldwide } = stage;

  return {
    finishes: finishes(stage),
    regionTeams: regionTeams(stage).map(toTeam),
    scale,
    sourceUrl,
    tournament: {
      beginAt: tournament.beginAt?.toISOString() ?? null,
      endAt: tournament.endAt?.toISOString() ?? null,
      event: eventRef(tournament),
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      source: tournament.source,
    },
    worldwide,
  };
};

const toPlacement = ({ team, placement }: TournamentParticipant): StagePlacement[] =>
  team && placement !== null ? [{ placement, team: toTeam(team) }] : [];

export class CircuitPersistence implements CircuitStore {
  constructor(private readonly em: EntityManager) {}

  async list() {
    const rows = await this.em.find(Circuit, {}, { orderBy: { createdAt: "DESC", name: "ASC" } });

    return rows.map(toSummary);
  }

  async find(idOrSlug: string) {
    const row = await this.em.findOne(
      Circuit,
      isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    );

    return row ? toSummary(row) : null;
  }

  async slugTaken(slug: string, exceptId: string | null) {
    const filter =
      exceptId !== null && exceptId !== "" ? { id: { $ne: exceptId }, slug } : { slug };

    return (await this.em.count(Circuit, filter)) > 0;
  }

  async withSeason(season: number | null) {
    const rows = await this.em.findAll(Circuit, { where: { season } });

    return rows.map(toSummary);
  }

  async save(circuit: CircuitSummary) {
    const row = (await this.em.findOne(Circuit, { id: circuit.id })) ?? new Circuit();
    Object.assign(row, circuit);

    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `A circuit with the slug "${circuit.slug}", or named "${circuit.name}" for this season and region, already exists.`,
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    return (await this.em.nativeDelete(Circuit, { id })) > 0;
  }

  async stages(circuitId: string) {
    const rows = await this.em.find(
      CircuitStage,
      { circuit: { id: circuitId } },
      {
        orderBy: { tournament: { beginAt: "ASC" } },
        populate: ["tournament.event", "teams.team"],
      },
    );

    return rows.map(toStageItem);
  }

  async stageResults(circuitId: string): Promise<StoredStageResult[]> {
    const rows = await this.em.find(
      CircuitStage,
      { circuit: { id: circuitId } },
      { populate: ["tournament.event", "teams.team"] },
    );

    const participants = rows.length
      ? await this.em.find(
          TournamentParticipant,
          {
            placement: { $ne: null },
            team: { $ne: null },
            tournament: { id: { $in: rows.map((row) => row.tournament.id) } },
          },
          { populate: ["team"] },
        )
      : [];

    const placements = new Map<string, StagePlacement[]>();

    for (const participant of participants) {
      const { id } = participant.tournament;
      placements.set(id, [...(placements.get(id) ?? []), ...toPlacement(participant)]);
    }

    return rows.map((stage) => ({
      beginAt: stage.tournament.beginAt,
      endAt: stage.tournament.endAt,
      event: eventRef(stage.tournament),
      finishes: finishes(stage),
      placements: placements.get(stage.tournament.id) ?? [],
      regionTeamIds: regionTeams(stage).map(({ id }) => id),
      scale: stage.scale,
      source: stage.tournament.source,
      sourceUrl: stage.sourceUrl,
      worldwide: stage.worldwide,
    }));
  }

  async eventTeams(tournamentId: string): Promise<CircuitEventTeam[] | null> {
    const tournament = await this.em.findOne(
      Tournament,
      { id: tournamentId },
      { fields: ["event"] },
    );

    if (!tournament) {
      return null;
    }

    const participants = await this.em.find(
      TournamentParticipant,
      { team: { $ne: null }, tournament: { event: tournament.event.id } },
      { populate: ["team"] },
    );

    const teams = new Map<string, CircuitEventTeam>();

    for (const { tournament: stage, team, placement } of participants) {
      if (!team) {
        continue;
      }

      const current = teams.get(team.id);
      const own = stage.id === tournamentId ? placement : null;
      teams.set(team.id, { placement: own ?? current?.placement ?? null, team: toTeam(team) });
    }

    return [...teams.values()].toSorted(
      (a, b) =>
        (a.placement ?? Number.MAX_SAFE_INTEGER) - (b.placement ?? Number.MAX_SAFE_INTEGER) ||
        a.team.name.localeCompare(b.team.name),
    );
  }

  async saveStage(circuitId: string, tournamentId: string, settings: CircuitStageSettings) {
    await this.em.transactional(async (em) => {
      const row =
        (await em.findOne(CircuitStage, {
          circuit: { id: circuitId },
          tournament: { id: tournamentId },
        })) ??
        Object.assign(new CircuitStage(), {
          circuit: em.getReference(Circuit, circuitId),
          tournament: em.getReference(Tournament, tournamentId),
        });

      row.scale = settings.scale;
      row.sourceUrl = settings.sourceUrl;
      row.worldwide = settings.worldwide;
      await em.persist(row).flush();
      await em.nativeDelete(CircuitStageTeam, { stage: row.id });
      const placements = new Map(settings.finishes.map((f) => [f.teamId, f.placement]));
      const region = new Set(settings.regionTeamIds);

      for (const teamId of new Set([...region, ...placements.keys()])) {
        em.persist(
          Object.assign(new CircuitStageTeam(), {
            placement: placements.get(teamId) ?? null,
            regionMember: region.has(teamId),
            stage: row,
            team: em.getReference(Team, teamId),
          }),
        );
      }
    });
  }

  async removeStage(circuitId: string, tournamentId: string) {
    const removed = await this.em.nativeDelete(CircuitStage, {
      circuit: { id: circuitId },
      tournament: { id: tournamentId },
    });

    return removed > 0;
  }
}
