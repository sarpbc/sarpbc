import { LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { RosterProposal } from "../../domain/roster-proposal";
import type { RosterProposalStore, RosterProposalTransaction } from "../../application/ports";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { User } from "../../../user/infrastructure/user-persistence";
import { participantName } from "@sarpbc/utils";
import {
  Match,
  Tournament,
  TournamentEvent,
} from "../../../tournament/infrastructure/competition-persistence";
import { Circuit } from "../../../circuit/infrastructure/circuit-persistence";
import { Season } from "../../../season/infrastructure/season-persistence";
import * as Row from "./roster-proposal.entity";

const entry = (id: string, label: string): [string, string] => [id, label];

const toProposal = (row: Row.RosterProposal): RosterProposal =>
  Object.assign(new RosterProposal(), {
    change: row.change,
    createdAt: row.createdAt,
    entityId: row.entityId,
    id: row.id,
    proposedById: row.proposedBy.id,
    reviewedAt: row.reviewedAt,
    reviewedById: row.reviewedBy?.id ?? null,
    sourceUrl: row.sourceUrl,
    status: row.status,
  });

export const rosterProposalStore = (
  em: EntityManager,
  inTransaction = false,
): RosterProposalStore => ({
  findById: async (id) => {
    const row = await em.findOne(
      Row.RosterProposal,
      { id },
      inTransaction ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {},
    );

    return row ? toProposal(row) : null;
  },
  list: async (status, limit) => {
    const rows = await em.find(
      Row.RosterProposal,
      { status },
      { limit, orderBy: { createdAt: "asc" } },
    );

    return rows.map(toProposal);
  },
  names: async (ids) => {
    const [players, teams, users, tournaments, matches, events, circuits, seasons] =
      await Promise.all([
        ids.players.length
          ? em.find(Player, { id: { $in: ids.players } }, { fields: ["id", "name"] })
          : [],
        ids.teams.length
          ? em.find(Team, { id: { $in: ids.teams } }, { fields: ["id", "name"] })
          : [],
        ids.users.length
          ? em.find(User, { id: { $in: ids.users } }, { fields: ["id", "userName"] })
          : [],
        ids.tournaments.length
          ? em.find(Tournament, { id: { $in: ids.tournaments } }, { populate: ["event"] })
          : [],
        ids.matches.length
          ? em.find(
              Match,
              { id: { $in: ids.matches } },
              { populate: ["participants.team", "participants.players", "tournament.event"] },
            )
          : [],
        ids.events.length
          ? em.find(TournamentEvent, { id: { $in: ids.events } }, { fields: ["id", "name"] })
          : [],
        ids.circuits.length
          ? em.find(Circuit, { id: { $in: ids.circuits } }, { fields: ["id", "name"] })
          : [],
        ids.seasons.length
          ? em.find(Season, { id: { $in: ids.seasons } }, { fields: ["id", "name"] })
          : [],
      ]);

    return Object.fromEntries([
      ...players.map((player) => entry(player.id, player.name)),
      ...teams.map((team) => entry(team.id, team.name)),
      ...users.map((user) => entry(user.id, user.userName)),
      ...events.map((event) => entry(event.id, event.name)),
      ...circuits.map((circuit) => entry(circuit.id, circuit.name)),
      ...seasons.map((season) => entry(season.id, season.name)),
      ...tournaments.map((tournament) =>
        entry(tournament.id, `${tournament.event.name} · ${tournament.name}`),
      ),
      ...matches.map((match) =>
        entry(
          match.id,
          [
            match.participants
              .map(({ team, players: lineup }) =>
                participantName({ players: lineup.getItems(), team }),
              )
              .join(" vs "),
            match.tournament.event.name,
            match.tournament.name,
            match.name,
          ].join(" · "),
        ),
      ),
    ]);
  },
  save: async (model) => {
    const row = model.id
      ? await em.findOneOrFail(Row.RosterProposal, { id: model.id })
      : new Row.RosterProposal();

    if (!model.id) {
      model.id = v4();
      row.id = model.id;
      row.createdAt = model.createdAt;
    }

    Object.assign(row, {
      change: model.change,
      entityId: model.entityId,
      proposedBy: em.getReference(User, model.proposedById),
      reviewedAt: model.reviewedAt,
      reviewedBy:
        model.reviewedById !== null && model.reviewedById !== ""
          ? em.getReference(User, model.reviewedById)
          : null,
      sourceUrl: model.sourceUrl,
      status: model.status,
    });
    em.persist(row);

    if (!inTransaction) {
      await em.flush();
    }
  },
});

export class MikroRosterProposalTransaction implements RosterProposalTransaction {
  constructor(private readonly em: EntityManager) {}
  async run<T>(work: (proposals: RosterProposalStore) => Promise<T>): Promise<T> {
    // Roster services called inside the work join this transaction through the ORM context.
    return await this.em.transactional(async (tx) => {
      const result = await work(rosterProposalStore(tx, true));
      await tx.flush();

      return result;
    });
  }
}
