import { EntityRepository } from "@mikro-orm/core";
import { TournamentParticipant } from "./tournament.entities";

export class TournamentParticipantRepository extends EntityRepository<TournamentParticipant> {}
