import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { AirRiddle } from "./domain/airriddle.entity";
import { AirRiddleController } from "./airriddle.controller";
import { AirRiddleService } from "./airriddle.service";
import { PlayerModule } from "src/player/player.module";

@Module({
  imports: [MikroOrmModule.forFeature([AirRiddle]), PlayerModule],
  controllers: [AirRiddleController],
  providers: [AirRiddleService],
  exports: [AirRiddleService],
})
export class AirRiddleModule {}
