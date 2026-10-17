import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { UserController } from "./http/user.controller";
import { UserService } from "../application/user.service";
import { User } from "./persistence/user.entity";
import { UserRepository } from "./persistence/user.repository";
import { USER_REPOSITORY } from "../application/ports/user.repository";
import { passwordHasher } from "./password-hasher";

@Module({
  imports: [MikroOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [
    UserRepository,
    {
      provide: UserService,
      useFactory: (repository: UserRepository) => new UserService(repository, passwordHasher),
      inject: [UserRepository],
    },
    {
      provide: USER_REPOSITORY,
      useExisting: UserRepository,
    },
  ],
  exports: [UserService, USER_REPOSITORY],
})
export class UserModule {}
