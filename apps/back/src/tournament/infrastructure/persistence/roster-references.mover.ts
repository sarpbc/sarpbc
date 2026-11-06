import type { EntityManager } from "@mikro-orm/postgresql";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import type { RosterReferenceMover, SharedTournaments } from "../../../roster/application/ports";
import { PlayerAward } from "./player-award.entities";
import { TournamentParticipant } from "./tournament.entities";
import { TournamentPrize } from "./tournament-prize.entities";

export class TournamentRosterReferences implements RosterReferenceMover, SharedTournaments {
  constructor(private readonly em: EntityManager) {}

  async movePlayer(from: string, to: string): Promise<void> {
    const { em } = this;
    await em.nativeUpdate(PlayerAward, { player: from }, { player: to });
    const participants = await em.find(
      TournamentParticipant,
      { players: from },
      { populate: ["players"] },
    );
    for (const participant of participants) {
      participant.players.remove(em.getReference(Player, from));
      participant.players.add(em.getReference(Player, to));
    }
    const prizes = await em.find(TournamentPrize, { players: from }, { populate: ["players"] });
    for (const prize of prizes) {
      prize.players.remove(em.getReference(Player, from));
      prize.players.add(em.getReference(Player, to));
    }
  }

  async moveTeam(from: string, to: string): Promise<void> {
    await this.em.nativeUpdate(TournamentParticipant, { team: from }, { team: to });
    await this.foldPrizes(from, to);
  }

  async sharedTournamentIds(teamId: string, otherTeamId: string): Promise<string[]> {
    const participants = await this.em.find(
      TournamentParticipant,
      { team: teamId, tournament: { participants: { team: otherTeamId } } },
      { fields: ["tournament"], disableIdentityMap: true },
    );
    return [...new Set(participants.map(({ tournament }) => tournament.id))];
  }

  private async foldPrizes(from: string, to: string): Promise<void> {
    const { em } = this;
    const prizes = await em.find(
      TournamentPrize,
      { team: { $in: [from, to] } },
      { populate: ["players"] },
    );
    const kept = new Map(
      prizes.filter(({ team }) => team.id === to).map((prize) => [prize.tournament.id, prize]),
    );
    const duplicates = prizes.filter(
      ({ team, tournament }) => team.id === from && kept.has(tournament.id),
    );
    for (const duplicate of duplicates)
      kept.get(duplicate.tournament.id)?.players.add(duplicate.players.getItems());
    if (duplicates.length > 0)
      await em.nativeDelete(TournamentPrize, { id: { $in: duplicates.map(({ id }) => id) } });
    await em.nativeUpdate(TournamentPrize, { team: from }, { team: to });
  }
}
