import { EntityRepository } from "@mikro-orm/postgresql";
import { TournamentParticipant } from "./domain/tournament-participant.entity";

export class TournamentParticipantRepository extends EntityRepository<TournamentParticipant> {}
