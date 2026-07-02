import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { User } from "./domain/user.entity";
import { UserRepository } from "./user.repository";
import { USER_REPOSITORY } from "./domain/user.repository.interface";

@Module({
  imports: [MikroOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useExisting: UserRepository,
    },
  ],
  exports: [UserService, USER_REPOSITORY],
})
export class UserModule {}
