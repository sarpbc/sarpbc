import { EntityRepository } from "@mikro-orm/core";
import { League } from "../tournament.entities";

export class LeagueRepository extends EntityRepository<League> {}
