import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import * as Row from "./player.entities";
import { LockMode } from "@mikro-orm/core";
import { toPlayer, toTeam, toContract, toPhoto } from "./roster.mapper";
import type { RosterStores, RosterTransaction } from "../../application/ports/roster-transaction";
import type { PlayerSearchProps } from "../../application/search-player-props";
import type { TeamSearchProps } from "../../../team/application/search-team-props";
export function rosterStores(em: EntityManager, flush = true): RosterStores {
  const complete = async () => {
    if (flush) await em.flush();
  };
  const playerQuery = (options: Partial<PlayerSearchProps>) => {
    const { name, start } = options;
    return start
      ? { name: { $ilike: start + "%" } }
      : name
        ? { name: { $ilike: "%" + name + "%" } }
        : {};
  };
  const teamQuery = (options: Partial<TeamSearchProps>) => {
    const { name, start } = options;
    return name
      ? { name: { $ilike: "%" + name + "%" } }
      : start
        ? { name: { $ilike: start + "%" } }
        : {};
  };
  const playerOptions = { populate: ["team", "photos"] as const };
  const teamOptions = { populate: ["players", "players.team"] as const };
  const contractOptions = { populate: ["player", "player.team", "team"] as const };
  const contractList = async (where: Parameters<typeof em.find<Row.Contract>>[1], past = false) =>
    (
      await em.find(Row.Contract, where, {
        ...contractOptions,
        orderBy: past ? { endDate: "desc" } : { startDate: "desc" },
      })
    ).map(toContract);
  return {
    players: {
      search: async (o) =>
        (
          await em.find(Row.Player, playerQuery({ ...o, start: undefined }), {
            ...playerOptions,
            limit: o.limit ?? 25,
            offset: o.offset ?? 0,
            orderBy: { name: "asc" },
          })
        ).map(toPlayer),
      searchAndCount: async (o) => {
        const [rows, count] = await em.findAndCount(Row.Player, playerQuery(o), {
          ...playerOptions,
          limit: o.limit ?? 25,
          offset: o.offset ?? 0,
          orderBy: { name: "asc" },
        });
        return [rows.map(toPlayer), count];
      },
      findById: async (id) => {
        const row = flush
          ? await em.findOne(Row.Player, { id }, playerOptions)
          : await em.findOne(
              Row.Player,
              { id },
              { refresh: true, lockMode: LockMode.PESSIMISTIC_WRITE },
            );
        if (row && !flush) await em.populate(row, ["team", "photos"], { refresh: true });
        return row ? toPlayer(row) : null;
      },
      findBySlug: async (slug) => {
        const row = await em.findOne(Row.Player, { slug }, playerOptions);
        return row ? toPlayer(row) : null;
      },
      getRandomPlayer: async () => {
        const rows: { id: string }[] = await em
          .getConnection()
          .execute("SELECT id FROM player ORDER BY random() LIMIT 1");
        const row = rows[0]
          ? await em.findOne(Row.Player, { id: rows[0].id }, playerOptions)
          : null;
        return row ? toPlayer(row) : null;
      },
      save: async (model) => {
        const row = model.id
          ? await em.findOneOrFail(Row.Player, { id: model.id })
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
          team: model.team ? em.getReference(Row.Team, model.team.id) : null,
        });
        em.persist(row);
        await complete();
      },
      delete: async (model) => {
        em.remove(em.getReference(Row.Player, model.id));
        await complete();
      },
    },
    teams: {
      search: async (o) =>
        (
          await em.find(Row.Team, teamQuery({ ...o, start: undefined }), {
            ...teamOptions,
            limit: o.limit ?? 25,
            offset: o.offset ?? 0,
            orderBy: { name: "asc" },
          })
        ).map((row) => toTeam(row)),
      searchAndCount: async (o) => {
        const [rows, count] = await em.findAndCount(Row.Team, teamQuery(o), {
          ...teamOptions,
          limit: o.limit ?? 25,
          offset: o.offset ?? 0,
          orderBy: { name: "asc" },
        });
        return [rows.map((row) => toTeam(row)), count];
      },
      findById: async (id) => {
        const row = await em.findOne(Row.Team, { id }, teamOptions);
        return row ? toTeam(row) : null;
      },
      findBySlug: async (slug) => {
        const row = await em.findOne(Row.Team, { slug }, teamOptions);
        return row ? toTeam(row) : null;
      },
      findWithPlayers: async (id) => {
        const row = await em.findOne(Row.Team, { id }, teamOptions);
        return row ? toTeam(row) : null;
      },
      findAllTeams: async () =>
        (await em.find(Row.Team, {}, teamOptions)).map((row) => toTeam(row)),
      save: async (model) => {
        const row = model.id ? await em.findOneOrFail(Row.Team, { id: model.id }) : new Row.Team();
        if (!model.id) model.id = v4();
        Object.assign(row, {
          id: model.id,
          name: model.name,
          slug: model.slug,
          pandascoreId: model.pandascoreId,
          active: model.active,
          location: model.location,
          imageUrl: model.imageUrl,
          darkModeImageUrl: model.darkModeImageUrl,
        });
        em.persist(row);
        await complete();
      },
      delete: async (model) => {
        em.remove(em.getReference(Row.Team, model.id));
        await complete();
      },
    },
    contracts: {
      findByPlayer: async (id) => contractList({ player: { id } }),
      findPastContractsByPlayer: async (id) =>
        contractList({ player: { id }, endDate: { $ne: null } }, true),
      findByTeam: async (id) => contractList({ team: { id } }),
      findFormerPlayersByTeam: async (id) =>
        contractList({ team: { id }, endDate: { $ne: null } }, true),
      findById: async (id) => {
        const row = await em.findOne(Row.Contract, { id }, contractOptions);
        return row ? toContract(row) : null;
      },
      findActiveContract: async (id) => {
        const row = await em.findOne(
          Row.Contract,
          { player: { id }, endDate: null },
          contractOptions,
        );
        return row ? toContract(row) : null;
      },
      save: async (model) => {
        const row = model.id
          ? await em.findOneOrFail(Row.Contract, { id: model.id })
          : new Row.Contract();
        if (!model.id) model.id = v4();
        Object.assign(row, {
          id: model.id,
          player: em.getReference(Row.Player, model.player.id),
          team: em.getReference(Row.Team, model.team.id),
          startDate: model.startDate,
          endDate: model.endDate,
          role: model.role,
          joinSourceUrl: model.joinSourceUrl,
          leaveSourceUrl: model.leaveSourceUrl,
          createdAt: model.createdAt,
        });
        em.persist(row);
        await complete();
      },
      delete: async (model) => {
        em.remove(em.getReference(Row.Contract, model.id));
        await complete();
      },
    },
    photos: {
      findByPlayer: async (id) =>
        (
          await em.find(Row.PlayerPhoto, { player: { id } }, { orderBy: { createdAt: "desc" } })
        ).map((row) => toPhoto(row)),
      findById: async (id) => {
        const row = await em.findOne(Row.PlayerPhoto, { id });
        return row ? toPhoto(row) : null;
      },
      save: async (model) => {
        const row = new Row.PlayerPhoto();
        if (!model.id) model.id = v4();
        Object.assign(row, {
          id: model.id,
          player: em.getReference(Row.Player, model.player.id),
          url: model.url,
          createdAt: model.createdAt,
        });
        em.persist(row);
        await complete();
      },
      delete: async (model) => {
        em.remove(em.getReference(Row.PlayerPhoto, model.id));
        await complete();
      },
    },
  };
}
export class MikroRosterTransaction implements RosterTransaction {
  constructor(private readonly em: EntityManager) {}
  run<T>(work: (stores: RosterStores) => Promise<T>): Promise<T> {
    return this.em.transactional(async (tx) => {
      const result = await work(rosterStores(tx, false));
      await tx.flush();
      return result;
    });
  }
}
