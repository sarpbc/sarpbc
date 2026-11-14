import { mapSequentially } from "../../../common/application/sequentially";
import { League } from "../../domain/league";
import { eventDisplayName } from "../../domain/tournament-event";
import type {
  CompetitionIncident,
  ProviderDeletion,
  UpsertLeagueCommand,
  UpsertSerieCommand,
} from "../feed";
import { placeStage } from "../event-placement";
import type { CompetitionWriteScope, EventWriter } from "../ports";
import type { Applied } from "./sync-applied";

type IncidentDeletion = Extract<CompetitionIncident, { changeType: "deletion" }>;

export const applyLeague = async (
  scope: CompetitionWriteScope,
  command: UpsertLeagueCommand,
): Promise<League> => {
  const league =
    (await scope.tournaments.leagueByPandascoreId(command.pandascoreId)) ??
    Object.assign(new League(), { pandascoreId: command.pandascoreId });

  league.name = command.name;
  league.slug ??= command.slug ?? null;
  league.url = command.url ?? null;
  league.imageUrl ??= command.imageUrl ?? null;
  league.modifiedAt = command.modifiedAt ?? null;
  await scope.tournaments.saveLeague(league);

  return league;
};

export const applySerie = async (
  events: EventWriter,
  command: UpsertSerieCommand,
): Promise<Applied | null> => {
  const event = await events.bySerieId(command.pandascoreId);
  const serieName = command.fullName?.trim();

  if (!event || serieName === undefined || serieName === "") {
    return null;
  }

  const stages = await events.stages(event.id);
  event.name = eventDisplayName({
    leagueName: event.league?.name ?? null,
    serieName,
    stageName: stages[0]?.name ?? "",
  });
  await events.save(event);

  return { stageIds: stages.map((stage) => stage.id), matches: [] };
};

const mergeSerie = async (
  scope: CompetitionWriteScope,
  serieId: number,
  intoId: number,
): Promise<Applied | null> => {
  const from = await scope.events.bySerieId(serieId);

  if (!from) {
    return null;
  }

  const stages = await scope.events.stages(from.id);
  const stageIds = stages.map((stage) => stage.id);
  const into = await scope.events.bySerieId(intoId);

  if (!into) {
    from.pandascoreSerieId = intoId;
    await scope.events.save(from);

    return { stageIds, matches: [] };
  }

  // Each placement derives its slug from the stages already in the target event, so order matters.
  await mapSequentially(stages, async (stage) => {
    const tournament = await scope.tournaments.load(stage.id);

    if (!tournament) {
      return;
    }

    await placeStage(scope.events, tournament, into);
    await scope.tournaments.save(tournament);
  });

  if (into.streams.length === 0 && from.streams.length > 0) {
    into.streams = from.streams;
    await scope.events.save(into);
  }

  await scope.events.remove(from.id);

  return { stageIds, matches: [] };
};

const applySerieDeletion = async (
  scope: CompetitionWriteScope,
  serieId: number,
  deletion: ProviderDeletion,
): Promise<Applied | null> => {
  switch (deletion.kind) {
    case "merged": {
      return await mergeSerie(scope, serieId, deletion.intoId);
    }

    case "replaced":
    case "deleted": {
      return null;
    }

    default: {
      const neverDeletion: never = deletion;

      return neverDeletion;
    }
  }
};

export const applyDeletion = async (
  scope: CompetitionWriteScope,
  incident: IncidentDeletion,
): Promise<Applied | null> => {
  switch (incident.kind) {
    case "serie": {
      return await applySerieDeletion(scope, incident.id, incident.deletion);
    }

    case "league":
    case "match":
    case "player":
    case "team":
    case "tournament": {
      return null;
    }

    default: {
      const neverKind: never = incident.kind;

      return neverKind;
    }
  }
};
