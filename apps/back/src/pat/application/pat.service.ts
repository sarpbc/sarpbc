import { ForbiddenError, NotFoundError } from "../../common/domain/errors";
import type { UserToken } from "../../common/application/models/user-token";
import { isStaffRole, type StaffRole } from "../../user/domain/staff-access";
import type { UserService } from "../../user/application/user.service";
import type { TokenSummary } from "../domain/token";
import type { TokenSecrets, TokenStore } from "./ports/token-store";

export interface PatUser extends UserToken {
  role: StaffRole;
}

export interface PatTokenCreated {
  id: string;
  name: string;
  createdAt: Date;
  token: string;
}

const LAST_USED_WRITE_INTERVAL_MS = 60_000;

export class PatService {
  constructor(
    private readonly tokens: TokenStore,
    private readonly users: Pick<UserService, "findById">,
    private readonly secrets: TokenSecrets,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createToken(userId: string, name: string): Promise<PatTokenCreated> {
    const user = await this.users.findById(userId);
    if (!user || !isStaffRole(user.role)) {
      throw new ForbiddenError(
        "API tokens are limited to staff accounts. Ask an admin for a staff role.",
      );
    }
    const { raw, hash } = this.secrets.issue();
    const token = await this.tokens.create(userId, name, hash);
    return { id: token.id, name: token.name, createdAt: token.createdAt, token: raw };
  }

  listTokens(userId: string): Promise<TokenSummary[]> {
    return this.tokens.listActive(userId);
  }

  async revokeToken(userId: string, tokenId: string): Promise<void> {
    if (!(await this.tokens.revokeOwned(userId, tokenId, this.now()))) {
      throw new NotFoundError("Token not found. It may already have been revoked.");
    }
  }

  async resolveUser(rawToken: string): Promise<PatUser | null> {
    const token = await this.tokens.findActive(this.secrets.hash(rawToken));
    if (!token || !isStaffRole(token.owner.role)) return null;
    const now = this.now();
    if (
      !token.lastUsedAt ||
      now.getTime() - token.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS
    ) {
      await this.tokens.touch(token.id, now);
    }
    return { id: token.owner.id, email: token.owner.email, role: token.owner.role };
  }
}
