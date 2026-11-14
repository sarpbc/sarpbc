import type { EntityManager } from "@mikro-orm/postgresql";
import type { RosterTransaction, RosterWriteScope } from "../../application/ports";
import { MikroPlayerStore } from "./player.store";
import { MikroTeamStore } from "./team.store";
import { MikroContractStore } from "./contract.store";
import { MikroPhotoStore } from "./photo.store";

export function writeScope(tx: EntityManager): RosterWriteScope {
  return {
    players: new MikroPlayerStore(tx, true),
    teams: new MikroTeamStore(tx),
    contracts: new MikroContractStore(tx),
    photos: new MikroPhotoStore(tx),
  };
}

export class MikroRosterTransaction implements RosterTransaction {
  constructor(private readonly em: EntityManager) {}
  async run<T>(work: (scope: RosterWriteScope) => Promise<T>): Promise<T> {
    return await this.em.transactional(async (tx) => {
      const result = await work(writeScope(tx));
      await tx.flush();

      return result;
    });
  }
}
