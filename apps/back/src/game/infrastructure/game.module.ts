import { Module } from "@nestjs/common";
import { AirRiddleModule } from "../airriddle/infrastructure/airriddle.module";
import { PickemModule } from "../pickem/infrastructure/pickem.module";

@Module({
  imports: [AirRiddleModule, PickemModule],
})
export class GameModule {}
