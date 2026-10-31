import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { Player, Team } from "../domain/roster";
import type { RosterMergeTransaction } from "./ports";

export interface RosterMerge<T> {
  kept: T;
  merged: T;
}

type Mergeable = Pick<Player | Team, "id" | "name" | "pandascoreId" | "mergedIntoId">;

function assertMergeable(kind: "player" | "team", kept: Mergeable, merged: Mergeable): void {
  if (kept.mergedIntoId) {
    throw new InvalidInputError(
      `${kept.name} was already merged into ${kind} "${kept.mergedIntoId}"; keep that ${kind} instead`,
    );
  }
  if (merged.mergedIntoId) {
    throw new ConflictError(
      `${merged.name} was already merged into ${kind} "${merged.mergedIntoId}"`,
    );
  }
  if (kept.pandascoreId && merged.pandascoreId && kept.pandascoreId !== merged.pandascoreId) {
    throw new ConflictError(
      `${kept.name} and ${merged.name} are distinct PandaScore ${kind}s (${kept.pandascoreId}, ${merged.pandascoreId})`,
    );
  }
}

export class RosterMergeService {
  constructor(private readonly transaction: RosterMergeTransaction) {}

  async mergePlayers(keptId: string, duplicateId: string): Promise<RosterMerge<Player>> {
    if (keptId === duplicateId) throw new InvalidInputError("Choose two different players");
    return this.transaction.run(async ({ players, references }) => {
      const kept = await players.findById(keptId);
      if (!kept) throw new NotFoundError(`Player with id "${keptId}" not found`);
      const merged = await players.findById(duplicateId);
      if (!merged) throw new NotFoundError(`Player with id "${duplicateId}" not found`);
      assertMergeable("player", kept, merged);
      if (kept.team && merged.team && kept.team.id !== merged.team.id) {
        throw new InvalidInputError(
          `${kept.name} plays for ${kept.team.name} and ${merged.name} for ${merged.team.name}; close one roster first`,
        );
      }

      await references.movePlayer(merged.id, kept.id);
      if (!kept.pandascoreId && merged.pandascoreId) {
        kept.pandascoreId = merged.pandascoreId;
        kept.source = "pandascore";
      }
      if (!kept.team && merged.team) {
        kept.team = merged.team;
        kept.status = merged.status;
      }
      kept.nationality ??= merged.nationality;
      kept.firstName ??= merged.firstName;
      kept.lastName ??= merged.lastName;
      kept.birthday ??= merged.birthday;
      kept.imageUrl ??= merged.imageUrl;

      merged.team = null;
      merged.pandascoreId = null;
      merged.mergedIntoId = kept.id;
      await players.save(merged);
      await players.save(kept);
      return { kept, merged };
    });
  }

  async mergeTeams(keptId: string, duplicateId: string): Promise<RosterMerge<Team>> {
    if (keptId === duplicateId) throw new InvalidInputError("Choose two different teams");
    return this.transaction.run(async ({ teams, references }) => {
      const kept = await teams.findById(keptId);
      if (!kept) throw new NotFoundError(`Team with id "${keptId}" not found`);
      const merged = await teams.findById(duplicateId);
      if (!merged) throw new NotFoundError(`Team with id "${duplicateId}" not found`);
      assertMergeable("team", kept, merged);
      // Two participants of one team in a tournament cannot be merged without rewriting matches.
      const shared = await references.sharedTournamentIds(kept.id, merged.id);
      if (shared.length > 0) {
        throw new ConflictError(
          `${kept.name} and ${merged.name} both took part in tournaments ${shared.join(", ")}`,
        );
      }

      await references.moveTeam(merged.id, kept.id);
      if (!kept.pandascoreId && merged.pandascoreId) {
        kept.pandascoreId = merged.pandascoreId;
        kept.source = "pandascore";
      }
      kept.location ??= merged.location;
      kept.imageUrl ??= merged.imageUrl;
      kept.darkModeImageUrl ??= merged.darkModeImageUrl;
      kept.logoLightUrl ??= merged.logoLightUrl;
      kept.logoDarkUrl ??= merged.logoDarkUrl;
      kept.active ||= merged.active;

      merged.active = false;
      merged.pandascoreId = null;
      merged.mergedIntoId = kept.id;
      await teams.save(merged);
      await teams.save(kept);
      return { kept, merged };
    });
  }
}
