import type { EntityManager } from "@mikro-orm/postgresql";
import type { Author } from "../../domain/author";
import { User } from "../../../user/infrastructure/persistence/user.entity";

export function authorReader(em: EntityManager) {
  return {
    async findById(id: string): Promise<Author | null> {
      const user = await em.findOne(User, { id });
      return user ? { id: user.id, userName: user.userName, role: user.role } : null;
    },
  };
}
