import type { StoredToken, TokenSummary } from "../../domain/token";

export interface TokenStore {
  create(ownerId: string, name: string, hash: string): Promise<TokenSummary>;
  listActive(ownerId: string): Promise<TokenSummary[]>;
  findActive(hash: string): Promise<StoredToken | null>;
  revokeOwned(ownerId: string, tokenId: string, at: Date): Promise<boolean>;
  touch(tokenId: string, at: Date): Promise<void>;
}

export interface TokenSecrets {
  issue(): { raw: string; hash: string };
  hash(raw: string): string;
}
