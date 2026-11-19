import assert from "node:assert/strict";
import { z } from "zod";
import type { Orm, Request } from "./support.mts";

const stageBody = z.object({
  tournament: z.looseObject({
    event: z.looseObject({ id: z.string(), slug: z.string() }),
    id: z.string(),
    participants: z.tuple([z.looseObject({ id: z.string() }), z.looseObject({ id: z.string() })]),
  }),
});

const matchBody = z.object({ match: z.looseObject({ id: z.string() }) });

const countRow = z.array(z.object({ count: z.coerce.number() }));

export interface StageDeletionContext {
  orm: Orm;
  request: Request;
  staffCookie: string;
  memberCookie: string;
  playerIds: [string, string];
  pandascoreStageId: string;
}

export const verifyStageDeletion = async ({
  orm,
  request,
  staffCookie,
  memberCookie,
  playerIds,
  pandascoreStageId,
}: StageDeletionContext) => {
  const sql = async (query: string, params: unknown[]) => {
    await orm.em.fork().getConnection().execute(query, params);
  };

  const count = async (table: string, stageId: string) => {
    const [row] = countRow.parse(
      await orm.em
        .fork()
        .getConnection()
        .execute(`select count(*) from "${table}" where "tournament_id" = ?`, [stageId]),
    );

    return row.count;
  };

  const created = await request(
    "POST",
    "/tournaments",
    {
      format: "1v1",
      name: "Deletion Ladder",
      playerParticipants: playerIds.map((id) => [id]),
    },
    staffCookie,
    201,
  );

  const stage = created.json(stageBody).tournament;
  const [winner, runnerUp] = stage.participants;

  await request(
    "POST",
    `/tournaments/${stage.id}/awards`,
    { awardType: "mvp", participantId: winner.id, playerId: playerIds[0] },
    staffCookie,
    201,
  );
  await sql(`update "tournament" set "winner_id" = ? where "id" = ?`, [winner.id, stage.id]);
  await sql(
    `insert into "tournament_prize" ("tournament_id", "placement", "amount", "currency", "team_id")
    select ?, 1, 100, 'EUR', "id" from "team" limit 1`,
    [stage.id],
  );

  const matchResponse = await request(
    "POST",
    `/tournaments/${stage.id}/matches`,
    { name: "Deletion Final", participantIds: [winner.id, runnerUp.id], status: "not_started" },
    staffCookie,
    201,
  );

  const { match } = matchResponse.json(matchBody);

  await request("DELETE", `/tournaments/${stage.id}`, undefined, memberCookie, 403);
  await request("DELETE", `/tournaments/${stage.id}`, undefined, staffCookie, 409);
  await request("DELETE", `/tournaments/matches/${match.id}`, undefined, staffCookie, 204);
  await request("DELETE", `/tournaments/${stage.id}`, undefined, staffCookie, 204);

  await request("GET", `/tournaments/${stage.id}`, undefined, undefined, 404);
  assert.deepEqual(
    await Promise.all(
      ["tournament_participant", "player_award", "tournament_prize"].map(
        async (table) => await count(table, stage.id),
      ),
    ),
    [0, 0, 0],
  );
  await request("DELETE", `/events/${stage.event.id}`, undefined, staffCookie, 204);

  await request("DELETE", `/tournaments/${stage.id}`, undefined, staffCookie, 404);
  await request("DELETE", `/tournaments/${pandascoreStageId}`, undefined, staffCookie, 400);
};
