import type { EntityManager } from "@mikro-orm/postgresql";
import { ConflictError } from "../../../common/domain/errors";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import type {
  RosterReferenceMover,
  SharedTournaments,
  TeamCompetitionUsage,
} from "../../../roster/application/ports";
import { MatchLineupPlayer } from "./match-lineup.entities";
import { PlayerAward } from "./player-award.entities";
import { Match, TournamentParticipant } from "./tournament.entities";
import { TournamentPrize } from "./tournament-prize.entities";

export class TournamentRosterReferences
  implements RosterReferenceMover, SharedTournaments, TeamCompetitionUsage
{
  constructor(private readonly em: EntityManager) {}

  async movePlayer(from: string, to: string): Promise<void> {
    const { em } = this;

    const clashes = await em.count(TournamentParticipant, {
      team: null,
      players: from,
      tournament: { participants: { team: null, players: to } },
    });

    if (clashes > 0)
      throw new ConflictError(
        "Both players are participants without a team in the same tournament. Remove one of them from that tournament before merging.",
      );
    await em.nativeUpdate(PlayerAward, { player: from }, { player: to });
    const keptLineups = await em.find(MatchLineupPlayer, { player: to }, { fields: ["match"] });
    await em.nativeDelete(MatchLineupPlayer, {
      player: from,
      match: { $in: keptLineups.map(({ match }) => match.id) },
    });
    await em.nativeUpdate(MatchLineupPlayer, { player: from }, { player: to });

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

  async teamReferences(teamId: string) {
    const [participations, matches, prizes] = await Promise.all([
      this.em.count(TournamentParticipant, { team: teamId }),
      this.em.count(Match, { participants: { team: teamId } }),
      this.em.count(TournamentPrize, { team: teamId }),
    ]);

    return { participations, matches, prizes };
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
