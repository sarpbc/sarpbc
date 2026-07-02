import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PickemChoice } from "./domain/pickem.entity";
import { PickemController } from "./pickem.controller";
import { PickemService } from "./pickem.service";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [MikroOrmModule.forFeature([PickemChoice]), UserModule],
  controllers: [PickemController],
  providers: [PickemService],
  exports: [PickemService],
})
export class PickemModule {}
