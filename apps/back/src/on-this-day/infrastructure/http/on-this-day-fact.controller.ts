import type { OnThisDayFact } from "@sarpbc/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { OnThisDayFactService } from "../../application/on-this-day-fact.service";
import { OnThisDayFactDto } from "./dto/on-this-day.dto";
import type { OnThisDayFactInput } from "./dto/on-this-day.dto";

@Controller("on-this-day-facts")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class OnThisDayFactController {
  constructor(private readonly facts: OnThisDayFactService) {}

  @Get()
  async list() {
    return { facts: await this.facts.list() } satisfies { facts: OnThisDayFact[] };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body({ schema: OnThisDayFactDto }) dto: OnThisDayFactInput) {
    return { fact: await this.facts.create(dto) } satisfies { fact: OnThisDayFact };
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: OnThisDayFactDto }) dto: OnThisDayFactInput,
  ) {
    return { fact: await this.facts.update(id, dto) } satisfies { fact: OnThisDayFact };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.facts.remove(id);
  }
}
