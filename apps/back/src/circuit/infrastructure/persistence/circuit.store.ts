import { EntityManager } from "@mikro-orm/postgresql";
import type {
  CircuitDetail,
  CircuitScaleTier,
  CircuitSummary,
  TournamentEventRef,
} from "@sarpbc/types";
import { isUuid } from "../../../common/domain/entity-ref";
import {
  Tournament,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type { CircuitStore } from "../../application/ports";
import type { CircuitStageResult, StagePlacement } from "../../domain/circuit-standings";
import { Circuit, CircuitStage } from "./circuit.entities";

function toSummary(row: Circuit): CircuitSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    qualificationSpots: row.qualificationSpots,
  };
}

function eventRef({ event }: Tournament): TournamentEventRef {
  return { id: event.id, slug: event.slug, name: event.name };
}

function toStageItem({
  tournament,
  scale,
  sourceUrl,
}: CircuitStage): CircuitDetail["stages"][number] {
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
  };
}

function toPlacement(participant: TournamentParticipant): StagePlacement[] {
  const { team, placement } = participant;
  if (!team || placement === null) return [];
  return [
    {
      placement,
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        imageUrl: team.imageUrl,
        darkModeImageUrl: team.darkModeImageUrl,
      },
    },
  ];
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
    const filter = exceptId ? { slug, id: { $ne: exceptId } } : { slug };
    return (await this.em.count(Circuit, filter)) > 0;
  }

  async save(circuit: CircuitSummary) {
    const row = (await this.em.findOne(Circuit, { id: circuit.id })) ?? new Circuit();
    Object.assign(row, circuit);
    await this.em.persist(row).flush();
  }

  async remove(id: string) {
    return (await this.em.nativeDelete(Circuit, { id })) > 0;
  }

  async stages(circuitId: string) {
    const rows = await this.em.find(
      CircuitStage,
      { circuit: { id: circuitId } },
      { populate: ["tournament.event"], orderBy: { tournament: { beginAt: "ASC" } } },
    );
    return rows.map(toStageItem);
  }

  async stageResults(circuitId: string): Promise<CircuitStageResult[]> {
    const rows = await this.em.find(
      CircuitStage,
      { circuit: { id: circuitId }, tournament: { source: "pandascore" } },
      { populate: ["tournament.event"] },
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
    return rows.map(({ tournament, scale, sourceUrl }) => ({
      event: eventRef(tournament),
      beginAt: tournament.beginAt,
      endAt: tournament.endAt,
      scale,
      sourceUrl,
      placements: placements.get(tournament.id) ?? [],
    }));
  }

  async tournamentSource(id: string) {
    const tournament = await this.em.findOne(Tournament, { id }, { fields: ["source"] });
    return tournament?.source ?? null;
  }

  async saveStage(
    circuitId: string,
    tournamentId: string,
    stage: { scale: CircuitScaleTier[]; sourceUrl: string },
  ) {
    const row =
      (await this.em.findOne(CircuitStage, {
        circuit: { id: circuitId },
        tournament: { id: tournamentId },
      })) ??
      Object.assign(new CircuitStage(), {
        circuit: this.em.getReference(Circuit, circuitId),
        tournament: this.em.getReference(Tournament, tournamentId),
      });
    row.scale = stage.scale;
    row.sourceUrl = stage.sourceUrl;
    await this.em.persist(row).flush();
  }

  async removeStage(circuitId: string, tournamentId: string) {
    const removed = await this.em.nativeDelete(CircuitStage, {
      circuit: { id: circuitId },
      tournament: { id: tournamentId },
    });
    return removed > 0;
  }
}
