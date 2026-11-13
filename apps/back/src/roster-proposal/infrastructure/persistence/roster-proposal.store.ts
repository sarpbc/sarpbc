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

function toProposal(row: Row.RosterProposal): RosterProposal {
  return Object.assign(new RosterProposal(), {
    id: row.id,
    change: row.change,
    sourceUrl: row.sourceUrl,
    status: row.status,
    proposedById: row.proposedBy.id,
    reviewedById: row.reviewedBy?.id ?? null,
    reviewedAt: row.reviewedAt,
    entityId: row.entityId,
    createdAt: row.createdAt,
  });
}

export function rosterProposalStore(em: EntityManager, inTransaction = false): RosterProposalStore {
  return {
    findById: async (id) => {
      const row = await em.findOne(
        Row.RosterProposal,
        { id },
        inTransaction ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {},
      );
      return row ? toProposal(row) : null;
    },
    list: async (status, limit) =>
      (await em.find(Row.RosterProposal, { status }, { orderBy: { createdAt: "asc" }, limit })).map(
        toProposal,
      ),
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
        sourceUrl: model.sourceUrl,
        status: model.status,
        proposedBy: em.getReference(User, model.proposedById),
        reviewedBy: model.reviewedById ? em.getReference(User, model.reviewedById) : null,
        reviewedAt: model.reviewedAt,
        entityId: model.entityId,
      });
      em.persist(row);
      if (!inTransaction) await em.flush();
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
        ...players.map((player) => [player.id, player.name]),
        ...teams.map((team) => [team.id, team.name]),
        ...users.map((user) => [user.id, user.userName]),
        ...events.map((event) => [event.id, event.name]),
        ...circuits.map((circuit) => [circuit.id, circuit.name]),
        ...seasons.map((season) => [season.id, season.name]),
        ...tournaments.map((tournament) => [
          tournament.id,
          `${tournament.event.name} · ${tournament.name}`,
        ]),
        ...matches.map((match) => [
          match.id,
          [
            match.participants
              .map(({ team, players }) => participantName({ team, players: players.getItems() }))
              .join(" vs "),
            match.tournament.event.name,
            match.tournament.name,
            match.name,
          ].join(" · "),
        ]),
      ]);
    },
  };
}

export class MikroRosterProposalTransaction implements RosterProposalTransaction {
  constructor(private readonly em: EntityManager) {}
  run<T>(work: (proposals: RosterProposalStore) => Promise<T>): Promise<T> {
    // Roster services called inside the work join this transaction through the ORM context.
    return this.em.transactional(async (tx) => {
      const result = await work(rosterProposalStore(tx, true));
      await tx.flush();
      return result;
    });
  }
}
