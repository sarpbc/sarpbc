import type { EntityManager } from "@mikro-orm/postgresql";
import { User } from "./user.entity";

export const authorReader = (em: EntityManager) => ({
  async findById(id: string) {
    const user = await em.findOne(User, { id });

    return user ? { id: user.id, role: user.role, userName: user.userName } : null;
  },
});
