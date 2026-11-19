import type { CreatedPatToken, PatToken } from "@sarpbc/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "../../../user/infrastructure/http/decorator/current-user.decorator";
import { CreateTokenDto } from "./dto/create-token.dto";
import type { CreateTokenInput } from "./dto/create-token.dto";
import { PatService } from "../../application/pat.service";

@Controller("pat")
export class PatController {
  constructor(private readonly patService: PatService) {}

  @UseGuards(AuthGuard)
  @Get("tokens")
  async listTokens(@CurrentUserId() userId: string) {
    const tokens = await this.patService.listTokens(userId);

    return {
      tokens: tokens.map((token) => ({
        createdAt: token.createdAt.toISOString(),
        id: token.id,
        lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
        name: token.name,
      })),
    } satisfies { tokens: PatToken[] };
  }

  @UseGuards(AuthGuard)
  @Post("tokens")
  @HttpCode(HttpStatus.CREATED)
  async createToken(
    @CurrentUserId() userId: string,
    @Body({ schema: CreateTokenDto }) dto: CreateTokenInput,
  ) {
    const created = await this.patService.createToken(userId, dto.name);

    return {
      createdAt: created.createdAt.toISOString(),
      id: created.id,
      name: created.name,
      token: created.token,
    } satisfies CreatedPatToken;
  }

  @UseGuards(AuthGuard)
  @Delete("tokens/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeToken(@CurrentUserId() userId: string, @Param("id") tokenId: string) {
    await this.patService.revokeToken(userId, tokenId);
  }
}
