import type { EntityManager } from "@mikro-orm/postgresql";
import type { UserTransaction, UserWriteScope } from "../../application/ports/user-store";
import { MikroUserStore } from "./user.store";

export class MikroUserTransaction implements UserTransaction {
  constructor(private readonly em: EntityManager) {}
  async run<T>(work: (scope: UserWriteScope) => Promise<T>): Promise<T> {
    return await this.em.transactional(async (tx) => {
      const result = await work({ users: new MikroUserStore(tx) });
      await tx.flush();

      return result;
    });
  }
}
