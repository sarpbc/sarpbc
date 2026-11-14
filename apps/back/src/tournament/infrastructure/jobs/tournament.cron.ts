import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MikroORM } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { TournamentSyncRunner } from "./tournament-sync.runner";

@Injectable()
export class TournamentCron {
  constructor(
    private readonly orm: MikroORM,
    private readonly runner: TournamentSyncRunner,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  @CreateRequestContext()
  async syncActiveTournaments(): Promise<void> {
    await this.runner.syncActiveTournaments();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @CreateRequestContext()
  async syncPandascoreAdditionsDaily(): Promise<void> {
    await this.runner.syncPandascoreAdditionsDaily();
  }
}
