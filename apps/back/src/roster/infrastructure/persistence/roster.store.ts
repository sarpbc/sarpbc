import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import * as Row from "./player.entities";
import {
  PlayerAward,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import { LockMode, type FilterQuery } from "@mikro-orm/core";
import { toPlayer, toTeam, toContract, toPhoto } from "./roster.mapper";
import type { Contract, Player, PlayerPhoto, Team } from "../../domain/roster";
import type {
  ContractQueries,
  ContractWriter,
  PhotoQueries,
  PhotoWriter,
  PlayerQueries,
  PlayerWriter,
  RosterMergeTransaction,
  RosterMergeWriteScope,
  RosterReferences,
  RosterTransaction,
  RosterWriteScope,
  TeamQueries,
  TeamWriter,
} from "../../application/ports";
import type { PlayerSearchProps, TeamSearchProps } from "../../application/search-props";

const playerOptions = { populate: ["team", "photos"] as const };
const teamOptions = { populate: ["players", "players.team"] as const };
const contractOptions = { populate: ["player", "player.team", "team"] as const };

const playerFilter = ({ name, start }: Partial<PlayerSearchProps>) =>
  start
    ? { name: { $ilike: start + "%" }, mergedInto: null }
    : name
      ? { name: { $ilike: "%" + name + "%" }, mergedInto: null }
      : { mergedInto: null };

const teamFilter = ({ name, start }: Partial<TeamSearchProps>) =>
  name
    ? { name: { $ilike: "%" + name + "%" }, mergedInto: null }
    : start
      ? { name: { $ilike: start + "%" }, mergedInto: null }
      : { mergedInto: null };

export class MikroPlayerStore implements PlayerQueries, PlayerWriter {
  constructor(
    private readonly em: EntityManager,
    private readonly locking = false,
  ) {}

  async search(o: Partial<PlayerSearchProps>) {
    return (
      await this.em.find(Row.Player, playerFilter({ ...o, start: undefined }), {
        ...playerOptions,
        limit: o.limit ?? 25,
        offset: o.offset ?? 0,
        orderBy: { name: "asc" },
      })
    ).map(toPlayer);
  }

  async searchAndCount(o: Partial<PlayerSearchProps>) {
    const [rows, count] = await this.em.findAndCount(Row.Player, playerFilter(o), {
      ...playerOptions,
      limit: o.limit ?? 25,
      offset: o.offset ?? 0,
      orderBy: { name: "asc" },
    });
    return [rows.map(toPlayer), count] as [ReturnType<typeof toPlayer>[], number];
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

  async save(model: Player) {
    const row = model.id
      ? await this.em.findOneOrFail(Row.Player, { id: model.id })
      : new Row.Player();
    if (!model.id) model.id = v4();
    Object.assign(row, {
      id: model.id,
      name: model.name,
      slug: model.slug,
      pandascoreId: model.pandascoreId,
      birthday: model.birthday,
      nationality: model.nationality,
      firstName: model.firstName,
      lastName: model.lastName,
      imageUrl: model.imageUrl,
      role: model.role,
      status: model.status,
      source: model.source,
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

  async search(o: Partial<TeamSearchProps>) {
    return (
      await this.em.find(Row.Team, teamFilter({ ...o, start: undefined }), {
        ...teamOptions,
        limit: o.limit ?? 25,
        offset: o.offset ?? 0,
        orderBy: { name: "asc" },
      })
    ).map((row) => toTeam(row));
  }

  async searchAndCount(o: Partial<TeamSearchProps>) {
    const [rows, count] = await this.em.findAndCount(Row.Team, teamFilter(o), {
      ...teamOptions,
      limit: o.limit ?? 25,
      offset: o.offset ?? 0,
      orderBy: { name: "asc" },
    });
    return [rows.map((row) => toTeam(row)), count] as [ReturnType<typeof toTeam>[], number];
  }

  async findById(id: string) {
    const row = await this.em.findOne(Row.Team, { id }, teamOptions);
    return row ? toTeam(row) : null;
  }

  async findBySlug(slug: string) {
    const row = await this.em.findOne(Row.Team, { slug }, teamOptions);
    return row ? toTeam(row) : null;
  }

  async findWithPlayers(id: string) {
    return this.findById(id);
  }

  async save(model: Team) {
    const row = model.id ? await this.em.findOneOrFail(Row.Team, { id: model.id }) : new Row.Team();
    if (!model.id) model.id = v4();
    Object.assign(row, {
      id: model.id,
      name: model.name,
      slug: model.slug,
      pandascoreId: model.pandascoreId,
      active: model.active,
      source: model.source,
      mergedInto: model.mergedIntoId ? this.em.getReference(Row.Team, model.mergedIntoId) : null,
      location: model.location,
      imageUrl: model.imageUrl,
      darkModeImageUrl: model.darkModeImageUrl,
    });
    this.em.persist(row);
  }

  async delete(model: Team) {
    this.em.remove(this.em.getReference(Row.Team, model.id));
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

function rosterReferences(em: EntityManager): RosterReferences {
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
      await em.nativeUpdate(PlayerAward, { player: from }, { player: to });
      const participants = await em.find(
        TournamentParticipant,
        { players: from },
        { populate: ["players"] },
      );
      for (const participant of participants) {
        participant.players.remove(em.getReference(Row.Player, from));
        participant.players.add(em.getReference(Row.Player, to));
      }
    },
    moveTeam: async (from, to) => {
      await em.nativeUpdate(Row.Team, { mergedInto: from }, { mergedInto: to });
      await mergeOpenContracts("team", from, to);
      await em.nativeUpdate(Row.Contract, { team: from }, { team: to });
      await em.nativeUpdate(Row.Player, { team: from }, { team: to });
      await em.nativeUpdate(TournamentParticipant, { team: from }, { team: to });
    },
    sharedTournamentIds: async (teamId, otherTeamId) => {
      const participants = await em.find(
        TournamentParticipant,
        { team: teamId, tournament: { participants: { team: otherTeamId } } },
        { fields: ["tournament"], disableIdentityMap: true },
      );
      return [...new Set(participants.map(({ tournament }) => tournament.id))];
    },
  };
}

export class MikroRosterMergeTransaction implements RosterMergeTransaction {
  constructor(private readonly em: EntityManager) {}
  run<T>(work: (scope: RosterMergeWriteScope) => Promise<T>): Promise<T> {
    return this.em.transactional(async (tx) => {
      const result = await work({ ...writeScope(tx), references: rosterReferences(tx) });
      await tx.flush();
      return result;
    });
  }
}
