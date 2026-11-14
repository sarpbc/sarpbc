import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { UserController } from "./http/user.controller";
import { UsersController } from "./http/users.controller";
import { UserService } from "../application/user.service";
import { MikroUserStore } from "./persistence/user.store";
import { MikroUserTransaction } from "./persistence/user.transaction";
import { passwordHasher } from "./password-hasher";

@Module({
  controllers: [UserController, UsersController],
  providers: [
    {
      provide: MikroUserStore,
      useFactory: (em: EntityManager) => new MikroUserStore(em),
      inject: [EntityManager],
    },
    {
      provide: MikroUserTransaction,
      useFactory: (em: EntityManager) => new MikroUserTransaction(em),
      inject: [EntityManager],
    },
    {
      provide: UserService,
      useFactory: (users: MikroUserStore, transaction: MikroUserTransaction) =>
        new UserService(users, transaction, passwordHasher),
      inject: [MikroUserStore, MikroUserTransaction],
    },
  ],
  exports: [UserService],
})
export class UserModule {}
