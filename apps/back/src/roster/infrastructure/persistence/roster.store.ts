import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import * as Row from "./player.entities";
import { LockMode, type FilterQuery } from "@mikro-orm/core";
import { playerColumns, teamColumns, toPlayer, toTeam, toContract, toPhoto } from "./roster.mapper";
import type { Contract, Player, PlayerPhoto, Team } from "../../domain/roster";
import type { TeamAlias } from "../../domain/team-alias";
import type {
  ContractQueries,
  ContractWriter,
  NationalityCount,
  PhotoQueries,
  PhotoWriter,
  PlayerQueries,
  PlayerWriter,
  RosterMergeTransaction,
  RosterMergeWriteScope,
  RosterReferenceMover,
  RosterTransaction,
  RosterWriteScope,
  SharedTournaments,
  TeamAliasTransaction,
  TeamAliasWriteScope,
  TeamAliasWriter,
  TeamQueries,
  TeamWriter,
} from "../../application/ports";
import type { ContractMovementFilter, DirectorySearchProps } from "../../application/search-props";

const playerOptions = { populate: ["team", "photos"] as const };
const teamOptions = { populate: ["players", "players.team"] as const };
const contractOptions = { populate: ["player", "player.team", "team"] as const };
const NATIONALITY_CODE = "upper(trim(nationality))";

/** A name search wins over a first-letter filter; both leave out merged duplicates. */
function directoryQuery({ name, start, limit, offset }: Partial<DirectorySearchProps>) {
  const pattern = name ? `%${name}%` : start ? `${start}%` : null;

  return {
    where: { ...(pattern && { name: { $ilike: pattern } }), mergedInto: null },
    page: { limit: limit ?? 25, offset: offset ?? 0, orderBy: { name: "asc" as const } },
  };
}

export class MikroPlayerStore implements PlayerQueries, PlayerWriter {
  constructor(
    private readonly em: EntityManager,
    private readonly locking = false,
  ) {}

  async search(options: Partial<DirectorySearchProps>) {
    const { where, page } = directoryQuery(options);

    return (await this.em.find(Row.Player, where, { ...playerOptions, ...page })).map(toPlayer);
  }

  async searchAndCount(options: Partial<DirectorySearchProps>): Promise<[Player[], number]> {
    const { where, page } = directoryQuery(options);

    const [rows, count] = await this.em.findAndCount(Row.Player, where, {
      ...playerOptions,
      ...page,
    });

    return [rows.map(toPlayer), count];
  }

  async findById(id: string) {
    const row = this.locking
      ? await this.em.findOne(
          Row.Player,
          { id },
          { refresh: true, lockMode: LockMode.PESSIMISTIC_WRITE },
        )
      : await this.em.findOne(Row.Player, { id }, playerOptions);

    if (row && this.locking) await this.em.populate(row, ["team", "photos"], { refresh: true });

    return row ? toPlayer(row) : null;
  }

  async findBySlug(slug: string) {
    const row = await this.em.findOne(Row.Player, { slug }, playerOptions);

    return row ? toPlayer(row) : null;
  }

  async getRandomPlayer() {
    const rows: { id: string }[] = await this.em
      .getConnection()
      .execute("SELECT id FROM player WHERE merged_into_id IS NULL ORDER BY random() LIMIT 1");

    const row = rows[0]
      ? await this.em.findOne(Row.Player, { id: rows[0].id }, playerOptions)
      : null;

    return row ? toPlayer(row) : null;
  }

  async nationalities(): Promise<NationalityCount[]> {
    const rows: { code: string; players: string }[] = await this.em
      .getConnection()
      .execute(
        `SELECT ${NATIONALITY_CODE} AS code, count(*) AS players FROM player WHERE merged_into_id IS NULL AND ${NATIONALITY_CODE} ~ '^[A-Z]{2}$' GROUP BY 1 ORDER BY 1`,
      );

    return rows.map(({ code, players }) => ({ code, players: Number(players) }));
  }

  async findByNationality(code: string) {
    const rows: { id: string }[] = await this.em
      .getConnection()
      .execute(`SELECT id FROM player WHERE merged_into_id IS NULL AND ${NATIONALITY_CODE} = ?`, [
        code,
      ]);

    if (rows.length === 0) return [];

    return (
      await this.em.find(
        Row.Player,
        { id: { $in: rows.map(({ id }) => id) } },
        { populate: ["team"], orderBy: { name: "asc" } },
      )
    ).map(toPlayer);
  }

  async save(model: Player) {
    const row = model.id
      ? await this.em.findOneOrFail(Row.Player, { id: model.id })
      : new Row.Player();

    if (!model.id) model.id = v4();
    Object.assign(row, playerColumns(model), {
      mergedInto: model.mergedIntoId ? this.em.getReference(Row.Player, model.mergedIntoId) : null,
      team: model.team ? this.em.getReference(Row.Team, model.team.id) : null,
    });
    this.em.persist(row);
  }

  async delete(model: Player) {
    this.em.remove(this.em.getReference(Row.Player, model.id));
  }
}

export class MikroTeamStore implements TeamQueries, TeamWriter {
  constructor(private readonly em: EntityManager) {}

  private async teamDirectoryQuery(options: Partial<DirectorySearchProps>) {
    const { where, page } = directoryQuery(options);

    if (!options.name) return { where, page };

    const aliases = await this.em.find(
      Row.TeamAlias,
      { name: { $ilike: `%${options.name}%` } },
      { fields: ["team"] },
    );

    if (aliases.length === 0) return { where, page };
    const { name, ...rest } = where;
    const formerly = { id: { $in: [...new Set(aliases.map(({ team }) => team.id))] } };

    return { where: { ...rest, $or: [{ name }, formerly] }, page };
  }

  async search(options: Partial<DirectorySearchProps>) {
    const { where, page } = await this.teamDirectoryQuery(options);

    return (await this.em.find(Row.Team, where, { ...teamOptions, ...page })).map((row) =>
      toTeam(row),
    );
  }

  async searchAndCount(options: Partial<DirectorySearchProps>): Promise<[Team[], number]> {
    const { where, page } = await this.teamDirectoryQuery(options);
    const [rows, count] = await this.em.findAndCount(Row.Team, where, { ...teamOptions, ...page });

    return [rows.map((row) => toTeam(row)), count];
  }

  async findById(id: string) {
    const row = await this.em.findOne(Row.Team, { id }, teamOptions);

    return row ? toTeam(row) : null;
  }

  async findBySlug(slug: string) {
    const row = await this.em.findOne(Row.Team, { slug }, teamOptions);

    return row ? toTeam(row) : null;
  }

  redirectCount(id: string) {
    return this.em.count(Row.Team, { mergedInto: id });
  }

  async save(model: Team) {
    const row = model.id ? await this.em.findOneOrFail(Row.Team, { id: model.id }) : new Row.Team();

    if (!model.id) model.id = v4();
    Object.assign(row, teamColumns(model), {
      mergedInto: model.mergedIntoId ? this.em.getReference(Row.Team, model.mergedIntoId) : null,
    });
    this.em.persist(row);
  }

  async delete(model: Team) {
    this.em.remove(this.em.getReference(Row.Team, model.id));
  }
}

export class MikroTeamAliasStore implements TeamAliasWriter {
  constructor(private readonly em: EntityManager) {}

  async pandascoreOwner(pandascoreId: number, exceptAliasId: string) {
    const team = await this.em.findOne(Row.Team, { pandascoreId });

    if (team) return team.name;

    const alias = await this.em.findOne(
      Row.TeamAlias,
      { pandascoreId, ...(exceptAliasId && { id: { $ne: exceptAliasId } }) },
      { populate: ["team"] },
    );

    return alias ? alias.team.name : null;
  }

  async save(teamId: string, model: TeamAlias) {
    const row = model.id
      ? await this.em.findOneOrFail(Row.TeamAlias, { id: model.id })
      : new Row.TeamAlias();

    if (!model.id) model.id = v4();
    Object.assign(row, {
      id: model.id,
      team: this.em.getReference(Row.Team, teamId),
      name: model.name,
      validFrom: model.from,
      validTo: model.to,
      sourceUrl: model.sourceUrl,
      logoUrl: model.logoUrl,
      pandascoreId: model.pandascoreId,
    });
    this.em.persist(row);
  }

  async delete(model: TeamAlias) {
    this.em.remove(this.em.getReference(Row.TeamAlias, model.id));
  }
}

export class MikroContractStore implements ContractQueries, ContractWriter {
  constructor(private readonly em: EntityManager) {}

  private async list(where: FilterQuery<Row.Contract>, past = false) {
    return (
      await this.em.find(Row.Contract, where, {
        ...contractOptions,
        orderBy: past ? { endDate: "desc" } : { startDate: "desc" },
      })
    ).map(toContract);
  }

  findByPlayer(id: string) {
    return this.list({ player: { id } });
  }

  findPastContractsByPlayer(id: string) {
    return this.list({ player: { id }, endDate: { $ne: null } }, true);
  }

  findByTeam(id: string) {
    return this.list({ team: { id } });
  }

  findFormerPlayersByTeam(id: string) {
    return this.list({ team: { id }, endDate: { $ne: null } }, true);
  }

  async findMovements({ teamId, playerId }: ContractMovementFilter) {
    const where: FilterQuery<Row.Contract> = {
      ...(teamId && { team: teamId }),
      ...(playerId && { player: playerId }),
    };

    return (await this.em.find(Row.Contract, where, { populate: ["player", "team"] })).map(
      toContract,
    );
  }

  async findMovementsOnDay(month: number, day: number) {
    const rows: { id: string }[] = await this.em
      .getConnection()
      .execute(
        "SELECT id FROM contract WHERE (extract(month from start_date) = ? AND extract(day from start_date) = ?) OR (extract(month from end_date) = ? AND extract(day from end_date) = ?)",
        [month, day, month, day],
      );

    if (rows.length === 0) return [];

    return (
      await this.em.find(
        Row.Contract,
        { id: { $in: rows.map(({ id }) => id) } },
        { populate: ["player", "team"] },
      )
    ).map(toContract);
  }

  async findById(id: string) {
    const row = await this.em.findOne(Row.Contract, { id }, contractOptions);

    return row ? toContract(row) : null;
  }

  async save(model: Contract) {
    const row = model.id
      ? await this.em.findOneOrFail(Row.Contract, { id: model.id })
      : new Row.Contract();

    if (!model.id) model.id = v4();
    Object.assign(row, {
      id: model.id,
      player: this.em.getReference(Row.Player, model.player.id),
      team: this.em.getReference(Row.Team, model.team.id),
      startDate: model.startDate,
      endDate: model.endDate,
      role: model.role,
      joinSourceUrl: model.joinSourceUrl,
      leaveSourceUrl: model.leaveSourceUrl,
      createdAt: model.createdAt,
    });
    this.em.persist(row);
  }

  async delete(model: Contract) {
    this.em.remove(this.em.getReference(Row.Contract, model.id));
  }
}

export class MikroPhotoStore implements PhotoQueries, PhotoWriter {
  constructor(private readonly em: EntityManager) {}

  async findByPlayer(id: string) {
    return (
      await this.em.find(Row.PlayerPhoto, { player: { id } }, { orderBy: { createdAt: "desc" } })
    ).map((row) => toPhoto(row));
  }

  async findById(id: string) {
    const row = await this.em.findOne(Row.PlayerPhoto, { id });

    return row ? toPhoto(row) : null;
  }

  async save(model: PlayerPhoto) {
    const row = new Row.PlayerPhoto();

    if (!model.id) model.id = v4();
    Object.assign(row, {
      id: model.id,
      player: this.em.getReference(Row.Player, model.player.id),
      url: model.url,
      createdAt: model.createdAt,
    });
    this.em.persist(row);
  }

  async delete(model: PlayerPhoto) {
    this.em.remove(this.em.getReference(Row.PlayerPhoto, model.id));
  }
}

function writeScope(tx: EntityManager): RosterWriteScope {
  return {
    players: new MikroPlayerStore(tx, true),
    teams: new MikroTeamStore(tx),
    contracts: new MikroContractStore(tx),
    photos: new MikroPhotoStore(tx),
  };
}

export class MikroRosterTransaction implements RosterTransaction {
  constructor(private readonly em: EntityManager) {}
  run<T>(work: (scope: RosterWriteScope) => Promise<T>): Promise<T> {
    return this.em.transactional(async (tx) => {
      const result = await work(writeScope(tx));
      await tx.flush();

      return result;
    });
  }
}

export class MikroTeamAliasTransaction implements TeamAliasTransaction {
  constructor(private readonly em: EntityManager) {}
  run<T>(work: (scope: TeamAliasWriteScope) => Promise<T>): Promise<T> {
    return this.em.transactional(async (tx) => {
      const result = await work({
        teams: new MikroTeamStore(tx),
        aliases: new MikroTeamAliasStore(tx),
      });

      await tx.flush();

      return result;
    });
  }
}

export interface RosterMergeParticipants extends SharedTournaments {
  movers: readonly RosterReferenceMover[];
}

function rosterReferences(
  em: EntityManager,
  others: RosterMergeParticipants,
): RosterReferenceMover & SharedTournaments {
  const mergeOpenContracts = async (owner: "player" | "team", from: string, to: string) => {
    const shared = owner === "player" ? "team" : "player";

    const open = await em.find(
      Row.Contract,
      { [owner]: { $in: [from, to] }, endDate: null },
      { disableIdentityMap: true },
    );

    const duplicates = open.filter(
      (contract) =>
        contract[owner].id === from &&
        open.some((kept) => kept[owner].id === to && kept[shared].id === contract[shared].id),
    );

    for (const kept of open.filter((contract) => contract[owner].id === to)) {
      const starts = [kept, ...duplicates.filter((d) => d[shared].id === kept[shared].id)].map(
        ({ startDate }) => new Date(startDate).getTime(),
      );

      if (starts.length > 1) {
        await em.nativeUpdate(
          Row.Contract,
          { id: kept.id },
          { startDate: new Date(Math.min(...starts)) },
        );
      }
    }

    await em.nativeDelete(Row.Contract, { id: { $in: duplicates.map(({ id }) => id) } });
  };

  return {
    movePlayer: async (from, to) => {
      // Frees the unique PandaScore id before the kept player takes it in the same flush.
      await em.nativeUpdate(Row.Player, { id: from }, { pandascoreId: null });
      await em.nativeUpdate(Row.Player, { mergedInto: from }, { mergedInto: to });
      await mergeOpenContracts("player", from, to);
      await em.nativeUpdate(Row.Contract, { player: from }, { player: to });
      await em.nativeUpdate(Row.PlayerPhoto, { player: from }, { player: to });

      for (const mover of others.movers) await mover.movePlayer(from, to);
    },
    moveTeam: async (from, to) => {
      await em.nativeUpdate(Row.Team, { mergedInto: from }, { mergedInto: to });
      await em.nativeUpdate(Row.TeamAlias, { team: from }, { team: to });
      await mergeOpenContracts("team", from, to);
      await em.nativeUpdate(Row.Contract, { team: from }, { team: to });
      await em.nativeUpdate(Row.Player, { team: from }, { team: to });

      for (const mover of others.movers) await mover.moveTeam(from, to);
    },
    sharedTournamentIds: (teamId, otherTeamId) => others.sharedTournamentIds(teamId, otherTeamId),
  };
}

export class MikroRosterMergeTransaction implements RosterMergeTransaction {
  constructor(
    private readonly em: EntityManager,
    private readonly participantsFor: (tx: EntityManager) => RosterMergeParticipants,
  ) {}
  run<T>(work: (scope: RosterMergeWriteScope) => Promise<T>): Promise<T> {
    return this.em.transactional(async (tx) => {
      const result = await work({
        ...writeScope(tx),
        references: rosterReferences(tx, this.participantsFor(tx)),
      });

      await tx.flush();

      return result;
    });
  }
}
