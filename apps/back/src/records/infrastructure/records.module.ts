import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { RecordBookService } from "../application/record-book.service";
import { RecordBookController } from "./http/record-book.controller";
import { RecordQueries } from "./persistence/record.queries";

@Module({
  controllers: [RecordBookController],
  providers: [
    {
      inject: [EntityManager],
      provide: RecordBookService,
      useFactory: (em: EntityManager) => new RecordBookService(new RecordQueries(em)),
    },
  ],
})
export class RecordsModule {}
