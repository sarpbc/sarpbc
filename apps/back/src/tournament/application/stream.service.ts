import type { Stream, StreamInput } from "@sarpbc/types";
import { isRedistributable } from "../../common/domain/data-source";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { replaceStreams } from "../domain/stream";
import type { StreamEditSource, StreamOwner } from "../domain/stream";
import type { CompetitionAfterCommit } from "./after-commit";
import { requireEvent } from "./event-placement";
import type { CompetitionTransaction, CompetitionWriteScope } from "./ports";

export interface OwnedStreams {
  streams: Stream[];
  inherited: Stream[];
}

interface LoadedOwner extends OwnedStreams {
  redistributable: boolean;
  tournamentIds: string[];
  save(streams: Stream[]): Promise<void>;
}

async function loadOwner(scope: CompetitionWriteScope, owner: StreamOwner): Promise<LoadedOwner> {
  switch (owner.kind) {
    case "event": {
      const event = await requireEvent(scope.events, owner.id);
      const stages = await scope.events.stages(event.id);

      return {
        streams: event.streams,
        inherited: [],
        redistributable:
          stages.length === 0 || stages.some((stage) => isRedistributable(stage.source)),
        tournamentIds: stages.map((stage) => stage.id),
        save: async (streams) => {
          event.streams = streams;
          await scope.events.save(event);
        },
      };
    }

    case "tournament": {
      const tournament = await scope.tournaments.load(owner.id);

      if (!tournament) {
        throw new NotFoundError(`Tournament with id "${owner.id}" was not found.`);
      }

      return {
        streams: tournament.streams,
        inherited: tournament.eventStreams,
        redistributable: isRedistributable(tournament.source),
        tournamentIds: [tournament.id],
        save: async (streams) => {
          tournament.streams = streams;
          await scope.tournaments.save(tournament);
        },
      };
    }

    case "match": {
      const match = await scope.matches.load(owner.id);

      if (!match) {
        throw new NotFoundError("Match not found");
      }

      return {
        streams: match.streams,
        inherited: match.inheritedStreams(),
        redistributable:
          isRedistributable(match.source) && isRedistributable(match.tournament.source),
        tournamentIds: [],
        save: async (streams) => {
          match.streams = streams;
          await scope.matches.save(match);
        },
      };
    }

    default: {
      const exhaustive: never = owner.kind;

      return exhaustive;
    }
  }
}

export class StreamService {
  constructor(
    private readonly transaction: CompetitionTransaction,
    private readonly afterCommit: CompetitionAfterCommit,
  ) {}

  async find(owner: StreamOwner): Promise<OwnedStreams> {
    return await this.transaction.run(async (scope) => {
      const { streams, inherited } = await loadOwner(scope, owner);

      return { streams, inherited };
    });
  }

  async set(
    owner: StreamOwner,
    inputs: readonly StreamInput[],
    source: StreamEditSource,
  ): Promise<OwnedStreams> {
    const { tournamentIds, ...owned } = await this.transaction.run(async (scope) => {
      const loaded = await loadOwner(scope, owner);

      const streams = replaceStreams(
        loaded.streams,
        inputs,
        loaded.redistributable ? source : "startgg",
      );

      await loaded.save(streams);

      return { streams, inherited: loaded.inherited, tournamentIds: loaded.tournamentIds };
    });

    await this.afterCommit.settle({ tournamentIds });

    return owned;
  }

  async requireProposable(owner: StreamOwner, inputs: readonly StreamInput[]): Promise<void> {
    await this.transaction.run(async (scope) => {
      const loaded = await loadOwner(scope, owner);

      if (!loaded.redistributable) {
        throw new InvalidInputError(`Streams of a start.gg ${owner.kind} cannot be proposed`);
      }

      replaceStreams(loaded.streams, inputs, "manual");
    });
  }
}
