import { createHash, randomBytes } from "node:crypto";
import { InjectRepository } from "@mikro-orm/nestjs";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import { UserToken } from "src/common/types/usertoken.interface";
import { isStaffRole } from "src/user/domain/staff-access";
import { UserService } from "src/user/user.service";
import { PersonalAccessToken } from "./domain/personal-access-token.entity";

const TOKEN_PREFIX = "sarpbc_pat_";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

@Injectable()
export class PatService {
  constructor(
    @InjectRepository(PersonalAccessToken)
    private readonly tokenRepository: EntityRepository<PersonalAccessToken>,
    private readonly userService: UserService,
    private readonly em: EntityManager,
  ) {}

  async createToken(
    userId: string,
    name: string,
  ): Promise<{ id: string; name: string; createdAt: Date; token: string }> {
    const user = await this.userService.findById(userId);
    if (!user || !isStaffRole(user.role)) {
      throw new ForbiddenException(
        "API tokens are limited to staff accounts. Ask an admin for a staff role.",
      );
    }

    const rawToken = generateRawToken();
    const token = new PersonalAccessToken();
    token.owner = user;
    token.name = name;
    token.tokenHash = hashToken(rawToken);

    await this.em.persist(token).flush();

    return {
      id: token.id,
      name: token.name,
      createdAt: token.createdAt,
      token: rawToken,
    };
  }

  async listTokens(
    userId: string,
  ): Promise<{ id: string; name: string; createdAt: Date; lastUsedAt: Date | null }[]> {
    const tokens = await this.tokenRepository.find(
      { owner: { id: userId }, revokedAt: null },
      { orderBy: { createdAt: "DESC" } },
    );

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt,
    }));
  }

  async revokeToken(userId: string, tokenId: string): Promise<void> {
    const token = await this.tokenRepository.findOne({
      id: tokenId,
      owner: { id: userId },
      revokedAt: null,
    });

    if (!token) {
      throw new NotFoundException("Token not found. It may already have been revoked.");
    }

    token.revokedAt = new Date();
    await this.em.flush();
  }

  async resolveUser(rawToken: string): Promise<UserToken | null> {
    const token = await this.tokenRepository.findOne(
      { tokenHash: hashToken(rawToken), revokedAt: null },
      { populate: ["owner"] },
    );

    if (!token) {
      return null;
    }

    token.lastUsedAt = new Date();
    await this.em.flush();

    return {
      id: token.owner.id,
      email: token.owner.email,
    };
  }
}
