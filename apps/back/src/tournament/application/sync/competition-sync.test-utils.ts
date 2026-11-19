import { competitionScope } from "../../../../test/competition-doubles";
import { Tournament } from "../../domain/tournament";
import { CompetitionAfterCommit } from "../after-commit";
import type { CompetitionIncident, UpsertMatchCommand, UpsertTournamentCommand } from "../feed";
import { recordingCache, recordingDiagnostics, recordingEvents } from "../ports.test-utils";
import { CompetitionSyncService } from "./competition-sync.service";

/** Synchronization that records what it is asked to apply. `outcomes` fail or pass its calls in order. */
export class RecordingCompetitionSync extends CompetitionSyncService {
  applied: {
    incident: CompetitionIncident;
    backfill: UpsertTournamentCommand | null | undefined;
  }[] = [];
  upserted: {
    command: UpsertTournamentCommand;
    matches: UpsertMatchCommand[];
    linkTournamentId: string | undefined;
  }[] = [];
  outcomes: (Error | null)[] = [];
  idPrefix = "";

  constructor() {
    const diagnostics = recordingDiagnostics();

    super(
      { run: async (work) => await work(competitionScope()) },
      new CompetitionAfterCommit(recordingCache(), recordingEvents(), diagnostics),
      diagnostics,
    );
  }

  override async upsertTournament(
    command: UpsertTournamentCommand,
    matches: UpsertMatchCommand[] = [],
    linkTournamentId?: string,
  ) {
    this.settle();
    this.upserted.push({ command, linkTournamentId, matches });

    return Object.assign(new Tournament(), { id: `${this.idPrefix}${command.pandascoreId}` });
  }

  override async applyIncident(
    incident: CompetitionIncident,
    backfill?: UpsertTournamentCommand | null,
  ) {
    this.applied.push({ backfill, incident });
    this.settle();
  }

  private settle() {
    const outcome = this.outcomes.shift();

    if (outcome) {
      throw outcome;
    }
  }
}
