import type { Stream, StreamInput } from "@sarpbc/types";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { replaceStreams } from "../domain/stream";
import type { StreamOwner } from "../domain/stream";
import type { CompetitionAfterCommit } from "./after-commit";
import { requireEvent } from "./event-placement";
import type { CompetitionTransaction, CompetitionWriteScope } from "./ports";

export interface OwnedStreams {
  streams: Stream[];
  inherited: Stream[];
}

interface LoadedOwner extends OwnedStreams {
  tournamentIds: string[];
  save: (streams: Stream[]) => Promise<void>;
}

const loadOwner = (async (scope, owner) => {
  switch (owner.kind) {
    case "event": {
      const event = await requireEvent(scope.events, owner.id);
      const stages = await scope.events.stages(event.id);

      return {
        inherited: [],
        save: async (streams) => {
          event.streams = streams;
          await scope.events.save(event);
        },
        streams: event.streams,
        tournamentIds: stages.map((stage) => stage.id),
      };
    }

    case "tournament": {
      const tournament = await scope.tournaments.load(owner.id);

      if (!tournament) {
        throw new NotFoundError(`Tournament with id "${owner.id}" was not found.`);
      }

      return {
        inherited: tournament.eventStreams,
        save: async (streams) => {
          tournament.streams = streams;
          await scope.tournaments.save(tournament);
        },
        streams: tournament.streams,
        tournamentIds: [tournament.id],
      };
    }

    case "match": {
      const match = await scope.matches.load(owner.id);

      if (!match) {
        throw new NotFoundError("Match not found");
      }

      return {
        inherited: match.inheritedStreams(),
        save: async (streams) => {
          match.streams = streams;
          await scope.matches.save(match);
        },
        streams: match.streams,
        tournamentIds: [],
      };
    }

    default: {
      const exhaustive: never = owner.kind;

      return exhaustive;
    }
  }
}) satisfies (scope: CompetitionWriteScope, owner: StreamOwner) => Promise<LoadedOwner>;

export class StreamService {
  constructor(
    private readonly transaction: CompetitionTransaction,
    private readonly afterCommit: CompetitionAfterCommit,
  ) {}

  async find(owner: StreamOwner) {
    return await this.transaction.run(async (scope) => {
      const { streams, inherited } = await loadOwner(scope, owner);

      return { inherited, streams };
    });
  }

  async set(owner: StreamOwner, inputs: readonly StreamInput[]) {
    const { tournamentIds, ...owned } = await this.transaction.run(async (scope) => {
      const loaded = await loadOwner(scope, owner);

      const streams = replaceStreams(inputs);

      await loaded.save(streams);

      return { inherited: loaded.inherited, streams, tournamentIds: loaded.tournamentIds };
    });

    await this.afterCommit.settle({ tournamentIds });

    return owned;
  }

  async requireProposable(owner: StreamOwner, inputs: readonly StreamInput[]) {
    await this.transaction.run(async (scope) => {
      await loadOwner(scope, owner);
      replaceStreams(inputs);
    });
  }
}
