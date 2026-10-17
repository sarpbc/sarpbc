import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { UserModule } from "../../user/infrastructure/user.module";
import { PersonalAccessToken } from "./persistence/personal-access-token.entity";
import { PatAuthGuard } from "./http/pat.guard";
import { PatController } from "./http/pat.controller";
import { PatService } from "../application/pat.service";
import { TokenRepository } from "./persistence/token.repository";
import { UserService } from "../../user/application/user.service";
import { tokenSecrets } from "./token-secrets";

@Module({
  imports: [MikroOrmModule.forFeature([PersonalAccessToken]), UserModule],
  controllers: [PatController],
  providers: [
    TokenRepository,
    {
      provide: PatService,
      useFactory: (tokens: TokenRepository, users: UserService) =>
        new PatService(tokens, users, tokenSecrets),
      inject: [TokenRepository, UserService],
    },
    PatAuthGuard,
  ],
  exports: [PatService, PatAuthGuard],
})
export class PatModule {}
