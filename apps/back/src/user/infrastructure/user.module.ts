import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/postgresql";
import { UserController } from "./http/user.controller";
import { UserService } from "../application/user.service";
import { User } from "./persistence/user.entity";
import { MikroUserStore, MikroUserTransaction } from "./persistence/user.store";
import { passwordHasher } from "./password-hasher";

@Module({
  imports: [MikroOrmModule.forFeature([User])],
  controllers: [UserController],
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
