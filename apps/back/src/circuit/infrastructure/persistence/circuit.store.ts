import { EntityManager } from "@mikro-orm/postgresql";
import type {
  CircuitDetail,
  CircuitEventTeam,
  CircuitStandingTeam,
  CircuitSummary,
  TournamentEventRef,
} from "@sarpbc/types";
import { isUuid } from "../../../common/domain/entity-ref";
import { ConflictError } from "../../../common/domain/errors";
import { isUniqueViolation } from "../../../common/infrastructure/persistence/constraint-violation";
import { Team } from "../../../roster/infrastructure/roster-persistence";
import {
  Tournament,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type { CircuitStore, StoredStageResult } from "../../application/ports";
import type { CircuitStageSettings } from "../../domain/circuit-scale";
import type { StagePlacement } from "../../domain/circuit-standings";
import { Circuit, CircuitStage, CircuitStageTeam } from "./circuit.entities";

function toSummary(row: Circuit): CircuitSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    season: row.season,
    region: row.region,
    description: row.description,
    sourceUrl: row.sourceUrl,
    qualificationSpots: row.qualificationSpots,
  };
}

function eventRef({ event }: Tournament): TournamentEventRef {
  return { id: event.id, slug: event.slug, name: event.name };
}

function toTeam(team: Team): CircuitStandingTeam {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    imageUrl: team.imageUrl,
    darkModeImageUrl: team.darkModeImageUrl,
  };
}

function regionTeams(stage: CircuitStage): Team[] {
  return stage.teams
    .getItems()
    .filter(({ regionMember }) => regionMember)
    .map(({ team }) => team)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function finishes(stage: CircuitStage): StagePlacement[] {
  return stage.teams
    .getItems()
    .flatMap(({ team, placement }) =>
      placement === null ? [] : [{ team: toTeam(team), placement }],
    )
    .sort((a, b) => a.placement - b.placement || a.team.name.localeCompare(b.team.name));
}

function toStageItem(stage: CircuitStage): CircuitDetail["stages"][number] {
  const { tournament, scale, sourceUrl, worldwide } = stage;

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      source: tournament.source,
      beginAt: tournament.beginAt?.toISOString() ?? null,
      endAt: tournament.endAt?.toISOString() ?? null,
      event: eventRef(tournament),
    },
    scale,
    sourceUrl,
    worldwide,
    regionTeams: regionTeams(stage).map(toTeam),
    finishes: finishes(stage),
  };
}

function toPlacement({ team, placement }: TournamentParticipant): StagePlacement[] {
  return team && placement !== null ? [{ placement, team: toTeam(team) }] : [];
}

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
      exceptId !== null && exceptId !== "" ? { slug, id: { $ne: exceptId } } : { slug };

    return (await this.em.count(Circuit, filter)) > 0;
  }

  async withSeason(season: number | null) {
    return (await this.em.find(Circuit, { season })).map(toSummary);
  }

  async save(circuit: CircuitSummary) {
    const row = (await this.em.findOne(Circuit, { id: circuit.id })) ?? new Circuit();
    Object.assign(row, circuit);

    try {
      await this.em.persist(row).flush();
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictError(
          `A circuit with the slug "${circuit.slug}", or named "${circuit.name}" for this season and region, already exists.`,
        );
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
        populate: ["tournament.event", "teams.team"],
        orderBy: { tournament: { beginAt: "ASC" } },
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
            tournament: { id: { $in: rows.map((row) => row.tournament.id) } },
            placement: { $ne: null },
            team: { $ne: null },
          },
          { populate: ["team"] },
        )
      : [];

    const placements = new Map<string, StagePlacement[]>();

    for (const participant of participants) {
      const id = participant.tournament.id;
      placements.set(id, [...(placements.get(id) ?? []), ...toPlacement(participant)]);
    }

    return rows.map((stage) => ({
      source: stage.tournament.source,
      event: eventRef(stage.tournament),
      beginAt: stage.tournament.beginAt,
      endAt: stage.tournament.endAt,
      scale: stage.scale,
      sourceUrl: stage.sourceUrl,
      worldwide: stage.worldwide,
      regionTeamIds: regionTeams(stage).map(({ id }) => id),
      placements: placements.get(stage.tournament.id) ?? [],
      finishes: finishes(stage),
    }));
  }

  async eventTeams(tournamentId: string): Promise<CircuitEventTeam[] | null> {
    const tournament = await this.em.findOne(
      Tournament,
      { id: tournamentId },
      { fields: ["event"] },
    );

    if (!tournament) return null;

    const participants = await this.em.find(
      TournamentParticipant,
      { tournament: { event: tournament.event.id }, team: { $ne: null } },
      { populate: ["team"] },
    );

    const teams = new Map<string, CircuitEventTeam>();

    for (const { tournament: stage, team, placement } of participants) {
      if (!team) continue;
      const current = teams.get(team.id);
      const own = stage.id === tournamentId ? placement : null;
      teams.set(team.id, { team: toTeam(team), placement: own ?? current?.placement ?? null });
    }

    return [...teams.values()].sort(
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

      for (const teamId of new Set([...region, ...placements.keys()]))
        em.persist(
          Object.assign(new CircuitStageTeam(), {
            stage: row,
            team: em.getReference(Team, teamId),
            placement: placements.get(teamId) ?? null,
            regionMember: region.has(teamId),
          }),
        );
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
