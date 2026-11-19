import type { CompetitionAfterCommit } from "../after-commit";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  CompetitionDiagnostics,
} from "../ports";
import type { CompetitionIncident, UpsertMatchCommand, UpsertTournamentCommand } from "../feed";
import { assertPandascoreUpsertAllowed } from "../../domain/tournament-source";
import type { AppliedTournament } from "./sync-applied";
import { applyDeletion, applyLeague, applySerie } from "./sync-catalog";
import { applyMatches } from "./sync-matches";
import { applyTournament, settleEndAt } from "./sync-tournament";

type IncidentChange = Exclude<CompetitionIncident, { changeType: "deletion" }>;

export class CompetitionSyncService {
  constructor(
    private readonly transaction: CompetitionTransaction,
    private readonly afterCommit: CompetitionAfterCommit,
    private readonly diagnostics: CompetitionDiagnostics,
  ) {}
  async upsertTournament(
    command: UpsertTournamentCommand,
    matches: UpsertMatchCommand[] = [],
    linkTournamentId?: string,
  ) {
    const result = await this.transaction.run(async (scope) => {
      const { tournament, stageIds } = await applyTournament(
        scope,
        this.diagnostics,
        command,
        linkTournamentId,
      );

      const applied = await applyMatches(scope, tournament, matches);
      await settleEndAt(scope, tournament);

      return { matches: applied, stageIds, tournament };
    });

    await this.afterCommit.settle({
      decidedMatchIds: result.matches,
      tournamentIds: result.stageIds,
    });

    return result.tournament;
  }
  async applyIncident(incident: CompetitionIncident, backfill?: UpsertTournamentCommand | null) {
    const applied = await this.transaction.run(async (scope) =>
      incident.changeType === "deletion"
        ? await applyDeletion(scope, incident)
        : await this.applyChange(scope, incident, backfill),
    );

    if (applied) {
      await this.afterCommit.settle({
        decidedMatchIds: applied.matches,
        tournamentIds: applied.stageIds,
      });
    }
  }
  private async applyChange(
    scope: CompetitionWriteScope,
    incident: IncidentChange,
    backfill: UpsertTournamentCommand | null | undefined,
  ) {
    switch (incident.kind) {
      case "tournament": {
        const { tournament, stageIds } = await applyTournament(
          scope,
          this.diagnostics,
          incident.command,
        );

        await settleEndAt(scope, tournament);

        return { matches: [], stageIds };
      }

      case "match": {
        const pandascoreId = incident.command.tournamentPandascoreId;
        const existing = await scope.tournaments.byPandascoreId(pandascoreId);

        let applied: AppliedTournament | null = null;

        if (existing) {
          applied = { stageIds: [existing.id], tournament: existing };
        } else if (backfill) {
          applied = await applyTournament(scope, this.diagnostics, backfill);
        }

        if (!applied) {
          return null;
        }

        assertPandascoreUpsertAllowed(applied.tournament, pandascoreId);
        const matches = await applyMatches(scope, applied.tournament, [incident.command]);
        await settleEndAt(scope, applied.tournament);

        return { matches, stageIds: applied.stageIds };
      }

      case "team": {
        await scope.rosters.upsertTeam(incident.command);

        return null;
      }

      case "player": {
        const currentTeam = incident.command.currentTeam
          ? await scope.rosters.upsertTeam(incident.command.currentTeam)
          : null;

        await scope.rosters.upsertPlayer(incident.command.player, currentTeam?.id ?? null);

        return null;
      }

      case "league": {
        await applyLeague(scope, incident.command);

        return null;
      }

      case "serie": {
        return await applySerie(scope.events, incident.command);
      }

      default: {
        const neverIncident: never = incident;

        return neverIncident;
      }
    }
  }
}
