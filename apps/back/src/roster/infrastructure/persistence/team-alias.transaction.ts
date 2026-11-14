import { EntityManager } from "@mikro-orm/postgresql";
import type { TeamAliasTransaction, TeamAliasWriteScope } from "../../application/ports";
import { MikroTeamStore } from "./team.store";
import { MikroTeamAliasStore } from "./team-alias.store";

export class MikroTeamAliasTransaction implements TeamAliasTransaction {
  constructor(private readonly em: EntityManager) {}
  async run<T>(work: (scope: TeamAliasWriteScope) => Promise<T>): Promise<T> {
    return await this.em.transactional(async (tx) => {
      const result = await work({
        teams: new MikroTeamStore(tx),
        aliases: new MikroTeamAliasStore(tx),
      });

      await tx.flush();

      return result;
    });
  }
}
