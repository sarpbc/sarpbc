import { Controller, Get, Header, Query } from "@nestjs/common";
import type { OnThisDay } from "@sarpbc/types";
import { parseIsoDay } from "@sarpbc/utils";
import { InvalidInputError } from "../../../common/domain/errors";
import { OnThisDayService } from "../../application/on-this-day.service";
import { OnThisDayQueryDto } from "./dto/on-this-day.dto";

@Controller("on-this-day")
export class OnThisDayController {
  constructor(private readonly onThisDay: OnThisDayService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=300")
  forDay(@Query({ schema: OnThisDayQueryDto }) { date }: OnThisDayQueryDto): Promise<OnThisDay> {
    if (date === undefined) return this.onThisDay.forDay(null);
    const day = parseIsoDay(date);

    if (!day) throw new InvalidInputError("The date is not a calendar date.");

    return this.onThisDay.forDay(day);
  }
}
