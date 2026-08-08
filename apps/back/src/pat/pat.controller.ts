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
import { AuthGuard } from "src/auth/auth.guard";
import { CurrentUserId } from "src/user/decorator/current-user.decorator";
import { CreateTokenDto } from "./dto/create-token.dto";
import { PatService } from "./pat.service";

@Controller("pat")
export class PatController {
  constructor(private readonly patService: PatService) {}

  @UseGuards(AuthGuard)
  @Get("tokens")
  async listTokens(@CurrentUserId() userId: string) {
    const tokens = await this.patService.listTokens(userId);
    return { tokens };
  }

  @UseGuards(AuthGuard)
  @Post("tokens")
  @HttpCode(HttpStatus.CREATED)
  async createToken(@CurrentUserId() userId: string, @Body() dto: CreateTokenDto) {
    return this.patService.createToken(userId, dto.name);
  }

  @UseGuards(AuthGuard)
  @Delete("tokens/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeToken(@CurrentUserId() userId: string, @Param("id") tokenId: string) {
    await this.patService.revokeToken(userId, tokenId);
  }
}
