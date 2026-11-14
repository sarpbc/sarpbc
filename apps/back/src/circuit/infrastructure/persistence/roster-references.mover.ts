import type { EntityManager } from "@mikro-orm/postgresql";
import type { RosterReferenceMover } from "../../../roster/application/ports";
import { CircuitStageTeam } from "./circuit-stage-team.entity";

export class CircuitRosterReferences implements RosterReferenceMover {
  constructor(private readonly em: EntityManager) {}

  async movePlayer(): Promise<void> {
    // No circuit row references a player.
  }

  async moveTeam(from: string, to: string): Promise<void> {
    const entries = await this.em.find(
      CircuitStageTeam,
      { team: { $in: [from, to] } },
      { disableIdentityMap: true },
    );

    const kept = new Set(entries.filter(({ team }) => team.id === to).map(({ stage }) => stage.id));

    const duplicates = entries
      .filter(({ team, stage }) => team.id === from && kept.has(stage.id))
      .map(({ id }) => id);

    if (duplicates.length)
      await this.em.nativeDelete(CircuitStageTeam, { id: { $in: duplicates } });
    await this.em.nativeUpdate(CircuitStageTeam, { team: from }, { team: to });
  }
}
