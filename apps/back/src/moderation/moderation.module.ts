import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Reply } from "../forum/forum.entities";
import { UserModule } from "../user/user.module";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";

@Module({
  imports: [MikroOrmModule.forFeature([Reply]), UserModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
