import { EntityManager } from "@mikro-orm/postgresql";
import type { StatsImportStore } from "../../application/ports";
import { ACTIVE_IMPORT_STATUSES } from "../../domain/stats-import";
import type { StatsImport } from "../../domain/stats-import";
import { MatchStatsImport } from "./match-stats-import.entity";

const toImport = (row: MatchStatsImport) => ({
  createdAt: row.createdAt,
  error: row.error,
  finishedAt: row.finishedAt,
  groupId: row.groupId,
  id: row.id,
  items: [...row.items],
  processed: row.processed,
  startedAt: row.startedAt,
  status: row.status,
  total: row.total,
  tournamentId: row.tournament.id,
});

export class MikroOrmStatsImportStore implements StatsImportStore {
  constructor(private readonly em: EntityManager) {}

  async create({ tournamentId, ...statsImport }: StatsImport) {
    this.em.create(MatchStatsImport, { ...statsImport, tournament: tournamentId });
    await this.em.flush();
  }

  async load(id: string) {
    const row = await this.em.findOne(MatchStatsImport, id, { refresh: true });

    return row ? toImport(row) : null;
  }

  async save(statsImport: StatsImport) {
    const row = await this.em.findOneOrFail(MatchStatsImport, statsImport.id);
    this.em.assign(row, {
      error: statsImport.error,
      finishedAt: statsImport.finishedAt,
      items: [...statsImport.items],
      processed: statsImport.processed,
      startedAt: statsImport.startedAt,
      status: statsImport.status,
      total: statsImport.total,
    });
    await this.em.flush();
  }

  async latest(tournamentId: string, limit: number) {
    const rows = await this.em.find(
      MatchStatsImport,
      { tournament: tournamentId },
      { limit, orderBy: { createdAt: "DESC" } },
    );

    return rows.map(toImport);
  }

  async failUnfinished(error: string) {
    return await this.em.nativeUpdate(
      MatchStatsImport,
      { status: { $in: [...ACTIVE_IMPORT_STATUSES] } },
      { error, finishedAt: new Date(), status: "failed" },
    );
  }
}
