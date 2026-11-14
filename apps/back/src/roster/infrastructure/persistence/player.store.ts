import type { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { Player as PlayerRow } from "./player.entity";
import { Team as TeamRow } from "./team.entity";
import { LockMode } from "@mikro-orm/core";
import { playerColumns, toPlayer } from "./roster.mapper";
import type { Player } from "../../domain/player";
import type { NationalityCount, PlayerQueries, PlayerWriter } from "../../application/ports";
import type { DirectorySearchProps } from "../../application/search-props";
import { directoryQuery } from "./directory-query";

const playerOptions = { populate: ["team", "photos"] as const };

const NATIONALITY_CODE = "upper(trim(nationality))";

export class MikroPlayerStore implements PlayerQueries, PlayerWriter {
  constructor(
    private readonly em: EntityManager,
    private readonly locking = false,
  ) {}

  async search(options: Partial<DirectorySearchProps>) {
    const { where, page } = directoryQuery(options);

    const rows = await this.em.find(PlayerRow, where, { ...playerOptions, ...page });

    return rows.map(toPlayer);
  }

  async searchAndCount(options: Partial<DirectorySearchProps>): Promise<[Player[], number]> {
    const { where, page } = directoryQuery(options);

    const [rows, count] = await this.em.findAndCount(PlayerRow, where, {
      ...playerOptions,
      ...page,
    });

    return [rows.map(toPlayer), count];
  }

  async findById(id: string) {
    const row = this.locking
      ? await this.em.findOne(
          PlayerRow,
          { id },
          { refresh: true, lockMode: LockMode.PESSIMISTIC_WRITE },
        )
      : await this.em.findOne(PlayerRow, { id }, playerOptions);

    if (row && this.locking) {
      await this.em.populate(row, ["team", "photos"], { refresh: true });
    }

    return row ? toPlayer(row) : null;
  }

  async findBySlug(slug: string) {
    const row = await this.em.findOne(PlayerRow, { slug }, playerOptions);

    return row ? toPlayer(row) : null;
  }

  async getRandomPlayer() {
    const rows: { id: string }[] = await this.em
      .getConnection()
      .execute("SELECT id FROM player WHERE merged_into_id IS NULL ORDER BY random() LIMIT 1");

    const first: { id: string } | undefined = rows[0];

    const row =
      first === undefined
        ? null
        : await this.em.findOne(PlayerRow, { id: first.id }, playerOptions);

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
    const ids: { id: string }[] = await this.em
      .getConnection()
      .execute(`SELECT id FROM player WHERE merged_into_id IS NULL AND ${NATIONALITY_CODE} = ?`, [
        code,
      ]);

    if (ids.length === 0) {
      return [];
    }

    const rows = await this.em.find(
      PlayerRow,
      { id: { $in: ids.map(({ id }) => id) } },
      { populate: ["team"], orderBy: { name: "asc" } },
    );

    return rows.map(toPlayer);
  }

  async save(model: Player) {
    const row = model.id
      ? await this.em.findOneOrFail(PlayerRow, { id: model.id })
      : new PlayerRow();

    if (!model.id) {
      model.id = v4();
    }

    Object.assign(row, playerColumns(model), {
      mergedInto:
        model.mergedIntoId !== null && model.mergedIntoId !== ""
          ? this.em.getReference(PlayerRow, model.mergedIntoId)
          : null,
      team: model.team ? this.em.getReference(TeamRow, model.team.id) : null,
    });
    this.em.persist(row);
  }

  async delete(model: Player) {
    this.em.remove(this.em.getReference(PlayerRow, model.id));
  }
}
