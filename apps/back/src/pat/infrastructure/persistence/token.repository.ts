import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import type { TokenStore } from "../../application/ports/token-store";
import { User } from "../../../user/infrastructure/user-persistence";
import { PersonalAccessToken } from "./personal-access-token.entity";

const summary = (token: PersonalAccessToken) => ({
  createdAt: token.createdAt,
  id: token.id,
  lastUsedAt: token.lastUsedAt,
  name: token.name,
});

@Injectable()
export class TokenRepository implements TokenStore {
  constructor(private readonly em: EntityManager) {}

  async create(ownerId: string, name: string, hash: string) {
    const token = new PersonalAccessToken();
    token.owner = this.em.getReference(User, ownerId);
    token.name = name;
    token.tokenHash = hash;
    await this.em.persist(token).flush();

    return summary(token);
  }

  async listActive(ownerId: string) {
    const tokens = await this.em.find(
      PersonalAccessToken,
      { owner: ownerId, revokedAt: null },
      { orderBy: { createdAt: "DESC" } },
    );

    return tokens.map(summary);
  }

  async findActive(hash: string) {
    const token = await this.em.findOne(
      PersonalAccessToken,
      { revokedAt: null, tokenHash: hash },
      { populate: ["owner"] },
    );

    return token
      ? {
          id: token.id,
          lastUsedAt: token.lastUsedAt,
          owner: { email: token.owner.email, id: token.owner.id, role: token.owner.role },
        }
      : null;
  }

  async revokeOwned(ownerId: string, tokenId: string, at: Date) {
    return (
      (await this.em.nativeUpdate(
        PersonalAccessToken,
        { id: tokenId, owner: ownerId, revokedAt: null },
        { revokedAt: at },
      )) > 0
    );
  }

  async touch(tokenId: string, at: Date) {
    await this.em.nativeUpdate(
      PersonalAccessToken,
      { id: tokenId, revokedAt: null },
      { lastUsedAt: at },
    );
  }
}
