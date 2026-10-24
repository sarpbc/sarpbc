import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PandascoreApiClient } from "./pandascore-api.client";
import { PandascoreCompetitionFeed } from "./pandascore-competition-feed";
import { PandascoreCurrentRosterSource } from "./pandascore-current-roster-source";

@Module({
  imports: [ConfigModule],
  providers: [PandascoreApiClient, PandascoreCompetitionFeed, PandascoreCurrentRosterSource],
  exports: [PandascoreApiClient, PandascoreCompetitionFeed, PandascoreCurrentRosterSource],
})
export class PandascoreModule {}
