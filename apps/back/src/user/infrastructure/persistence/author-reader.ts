import type { EntityManager } from "@mikro-orm/postgresql";
import type { Author } from "../../../common/domain/author";
import { User } from "./user.entity";

export const authorReader = (em: EntityManager) => ({
  async findById(id: string): Promise<Author | null> {
    const user = await em.findOne(User, { id });

    return user ? { id: user.id, userName: user.userName, role: user.role } : null;
  },
});
