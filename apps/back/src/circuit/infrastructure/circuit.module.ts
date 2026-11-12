import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { CircuitService } from "../application/circuit.service";
import { CircuitController } from "./http/circuit.controller";
import { CircuitPersistence } from "./persistence/circuit.store";

@Module({
  controllers: [CircuitController],
  providers: [
    {
      provide: CircuitService,
      useFactory: (em: EntityManager) => new CircuitService(new CircuitPersistence(em)),
      inject: [EntityManager],
    },
  ],
  exports: [CircuitService],
})
export class CircuitModule {}
