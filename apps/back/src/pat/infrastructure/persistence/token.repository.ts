import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import type { TokenStore } from "../../application/ports/token-store";
import type { StoredToken, TokenSummary } from "../../domain/token";
import { User } from "../../../user/infrastructure/persistence/user.entity";
import { PersonalAccessToken } from "./personal-access-token.entity";

function summary(token: PersonalAccessToken): TokenSummary {
  return {
    id: token.id,
    name: token.name,
    createdAt: token.createdAt,
    lastUsedAt: token.lastUsedAt,
  };
}

@Injectable()
export class TokenRepository implements TokenStore {
  constructor(private readonly em: EntityManager) {}

  async create(ownerId: string, name: string, hash: string): Promise<TokenSummary> {
    const token = new PersonalAccessToken();
    token.owner = this.em.getReference(User, ownerId);
    token.name = name;
    token.tokenHash = hash;
    await this.em.persist(token).flush();
    return summary(token);
  }

  async listActive(ownerId: string): Promise<TokenSummary[]> {
    const tokens = await this.em.find(
      PersonalAccessToken,
      { owner: ownerId, revokedAt: null },
      { orderBy: { createdAt: "DESC" } },
    );
    return tokens.map(summary);
  }

  async findActive(hash: string): Promise<StoredToken | null> {
    const token = await this.em.findOne(
      PersonalAccessToken,
      { tokenHash: hash, revokedAt: null },
      { populate: ["owner"] },
    );
    return token
      ? {
          id: token.id,
          owner: { id: token.owner.id, email: token.owner.email, role: token.owner.role },
          lastUsedAt: token.lastUsedAt,
        }
      : null;
  }

  async revokeOwned(ownerId: string, tokenId: string, at: Date): Promise<boolean> {
    return (
      (await this.em.nativeUpdate(
        PersonalAccessToken,
        { id: tokenId, owner: ownerId, revokedAt: null },
        { revokedAt: at },
      )) > 0
    );
  }

  async touch(tokenId: string, at: Date): Promise<void> {
    await this.em.nativeUpdate(
      PersonalAccessToken,
      { id: tokenId, revokedAt: null },
      { lastUsedAt: at },
    );
  }
}
