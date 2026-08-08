import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { UserModule } from "src/user/user.module";
import { PersonalAccessToken } from "./domain/personal-access-token.entity";
import { PatAuthGuard } from "./pat.guard";
import { PatController } from "./pat.controller";
import { PatService } from "./pat.service";

@Module({
  imports: [MikroOrmModule.forFeature([PersonalAccessToken]), UserModule],
  controllers: [PatController],
  providers: [PatService, PatAuthGuard],
  exports: [PatService, PatAuthGuard],
})
export class PatModule {}
