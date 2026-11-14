import { mapSequentially } from "../../../common/application/sequentially";
import type { Tournament } from "../../domain/tournament";
import type { TournamentParticipant } from "../../domain/tournament-participant";
import type { UpsertMatchCommand } from "../feed";
import { upsertSyncedMatchInTransaction } from "../match/write-match";
import type { CompetitionWriteScope } from "../ports";

const opponentParticipantIds = (
  command: UpsertMatchCommand,
  participants: TournamentParticipant[],
): string[] => {
  const ids =
    command.opponentPandascoreIds?.length !== undefined &&
    command.opponentPandascoreIds.length !== 0
      ? command.opponentPandascoreIds.map(
          (id) => participants.find((p) => p.team?.pandascoreId === id)?.id,
        )
      : command.opponentSlugs.map((slug) => participants.find((p) => p.team?.slug === slug)?.id);

  return ids.filter((id): id is string => Boolean(id));
};

export const applyMatches = async (
  scope: CompetitionWriteScope,
  tournament: Tournament,
  commands: UpsertMatchCommand[],
): Promise<string[]> => {
  const participants = await scope.tournaments.participants(tournament.id);

  // Bracket links only resolve to matches already written, so earlier matches go first.
  const ordered = commands.toSorted(
    (a, b) => (a.beginAt?.getTime() ?? 0) - (b.beginAt?.getTime() ?? 0),
  );

  const decided = await mapSequentially(
    ordered.filter((command) => command.beginAt),
    async (command) => {
      const match = await upsertSyncedMatchInTransaction(scope.matches, tournament.id, {
        ...command,
        participantIds: opponentParticipantIds(command, participants),
        results: command.results.map((r) => ({
          participantId:
            participants.find((p) => p.team?.pandascoreId === r.teamPandascoreId)?.id ?? null,
          score: r.score,
        })),
      });

      return match.isDecided() ? match.id : null;
    },
  );

  return decided.filter((id): id is string => id !== null);
};
