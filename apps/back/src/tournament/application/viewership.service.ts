import type { Viewership, ViewershipResponse } from "@sarpbc/types";
import { isRedistributable } from "../../common/domain/data-source";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { requireViewership } from "../domain/viewership";
import type { ViewershipOwner } from "../domain/viewership";
import type { EventWriter, MatchWriter } from "./ports";

export interface ViewershipScope {
  events: Pick<EventWriter, "load" | "stages" | "save">;
  matches: Pick<MatchWriter, "load" | "save">;
}

export interface ViewershipTransaction {
  run: <T>(work: (scope: ViewershipScope) => Promise<T>) => Promise<T>;
}

interface LoadedOwner {
  viewership: Viewership | null;
  redistributable: boolean;
  save: (viewership: Viewership | null) => Promise<void>;
}

const loadOwner = (async (scope, owner) => {
  switch (owner.kind) {
    case "event": {
      const event = await scope.events.load(owner.id);

      if (!event) {
        throw new NotFoundError(`Event with id "${owner.id}" was not found.`);
      }

      const stages = await scope.events.stages(event.id);

      return {
        redistributable:
          stages.length === 0 || stages.some((stage) => isRedistributable(stage.source)),
        save: async (viewership) => {
          event.viewership = viewership;
          await scope.events.save(event);
        },
        viewership: event.viewership,
      };
    }

    case "match": {
      const match = await scope.matches.load(owner.id);

      if (!match) {
        throw new NotFoundError("Match not found");
      }

      return {
        redistributable:
          isRedistributable(match.source) && isRedistributable(match.tournament.source),
        save: async (viewership) => {
          match.viewership = viewership;
          await scope.matches.save(match);
        },
        viewership: match.viewership,
      };
    }

    default: {
      const exhaustive: never = owner.kind;

      return exhaustive;
    }
  }
}) satisfies (scope: ViewershipScope, owner: ViewershipOwner) => Promise<LoadedOwner>;

export class ViewershipService {
  constructor(private readonly transaction: ViewershipTransaction) {}

  async find(owner: ViewershipOwner) {
    return (await this.transaction.run(async (scope) => {
      const loaded = await loadOwner(scope, owner);

      return { viewership: loaded.viewership };
    })) satisfies ViewershipResponse;
  }

  async set(owner: ViewershipOwner, input: Viewership | null) {
    const viewership = input && requireViewership(input);

    return (await this.transaction.run(async (scope) => {
      const loaded = await loadOwner(scope, owner);
      await loaded.save(viewership);

      return { viewership };
    })) satisfies ViewershipResponse;
  }

  async requireProposable(owner: ViewershipOwner, input: Viewership) {
    requireViewership(input);
    await this.transaction.run(async (scope) => {
      const loaded = await loadOwner(scope, owner);

      if (!loaded.redistributable) {
        throw new InvalidInputError(
          `The viewership of a start.gg ${owner.kind} cannot be proposed`,
        );
      }
    });
  }
}
