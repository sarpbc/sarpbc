import { EntityManager } from "@mikro-orm/postgresql";
import type { StatsImportStore } from "../../application/ports";
import { ACTIVE_IMPORT_STATUSES } from "../../domain/stats-import";
import type { StatsImport } from "../../domain/stats-import";
import { MatchStatsImport } from "./match-stats-import.entity";

function toImport(row: MatchStatsImport): StatsImport {
  return {
    id: row.id,
    tournamentId: row.tournament.id,
    groupId: row.groupId,
    status: row.status,
    total: row.total,
    processed: row.processed,
    items: [...row.items],
    error: row.error,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

export class MikroOrmStatsImportStore implements StatsImportStore {
  constructor(private readonly em: EntityManager) {}

  async create({ tournamentId, ...statsImport }: StatsImport): Promise<void> {
    this.em.create(MatchStatsImport, { ...statsImport, tournament: tournamentId });
    await this.em.flush();
  }

  async load(id: string): Promise<StatsImport | null> {
    const row = await this.em.findOne(MatchStatsImport, id, { refresh: true });

    return row ? toImport(row) : null;
  }

  async save(statsImport: StatsImport): Promise<void> {
    const row = await this.em.findOneOrFail(MatchStatsImport, statsImport.id);
    this.em.assign(row, {
      status: statsImport.status,
      total: statsImport.total,
      processed: statsImport.processed,
      items: [...statsImport.items],
      error: statsImport.error,
      startedAt: statsImport.startedAt,
      finishedAt: statsImport.finishedAt,
    });
    await this.em.flush();
  }

  async latest(tournamentId: string, limit: number): Promise<StatsImport[]> {
    const rows = await this.em.find(
      MatchStatsImport,
      { tournament: tournamentId },
      { orderBy: { createdAt: "DESC" }, limit },
    );

    return rows.map(toImport);
  }

  async failUnfinished(error: string): Promise<number> {
    return await this.em.nativeUpdate(
      MatchStatsImport,
      { status: { $in: [...ACTIVE_IMPORT_STATUSES] } },
      { status: "failed", error, finishedAt: new Date() },
    );
  }
}
