import { Module } from "@nestjs/common";
import { AirRiddleModule } from "./airriddle/airriddle.module";
import { PickemModule } from "./pickem/pickem.module";

@Module({
  imports: [AirRiddleModule, PickemModule],
})
export class GameModule {}
