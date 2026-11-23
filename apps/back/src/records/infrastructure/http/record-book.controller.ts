import type { RecordBook } from "@sarpbc/types";
import { Controller, Get, Header, Query } from "@nestjs/common";
import { RecordBookService } from "../../application/record-book.service";
import { RecordBookQueryDto } from "./dto/record-book.dto";
import type { RecordBookQueryInput } from "./dto/record-book.dto";

@Controller("records")
export class RecordBookController {
  constructor(private readonly records: RecordBookService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=3600")
  async book(@Query({ schema: RecordBookQueryDto }) { venue }: RecordBookQueryInput) {
    return (await this.records.book(venue ?? null)) satisfies RecordBook;
  }
}
