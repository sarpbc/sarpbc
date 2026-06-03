import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PandascoreService } from "./pandascore.service";

@Module({
  imports: [ConfigModule],
  providers: [PandascoreService],
  exports: [PandascoreService],
})
export class PandascoreModule {}
