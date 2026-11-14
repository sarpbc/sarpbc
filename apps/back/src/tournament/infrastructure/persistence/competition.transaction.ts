import type { EntityManager } from "@mikro-orm/postgresql";
import { RosterSyncWriter } from "../../../roster/infrastructure/roster-persistence";
import type { CompetitionTransaction, CompetitionWriteScope } from "../../application/ports";
import { CompetitionAwardWriter } from "./player-award.writer";
import { CompetitionPrizeWriter } from "./tournament-prize.writer";
import { CompetitionLineupWriter } from "./match-lineup.writer";
import { CompetitionTournamentWriter } from "./tournament.writer";
import { CompetitionMatchWriter } from "./match.writer";
import { CompetitionEventWriter } from "./event.writer";

function lazyWriteScope(em: EntityManager): CompetitionWriteScope {
  let tournaments: CompetitionTournamentWriter | undefined;
  let events: CompetitionEventWriter | undefined;
  let matches: CompetitionMatchWriter | undefined;
  let rosters: RosterSyncWriter | undefined;
  let awards: CompetitionAwardWriter | undefined;
  let prizes: CompetitionPrizeWriter | undefined;
  let lineups: CompetitionLineupWriter | undefined;
  const tournamentWriter = () => (tournaments ??= new CompetitionTournamentWriter(em));

  return {
    get tournaments() {
      return tournamentWriter();
    },
    get events() {
      return (events ??= new CompetitionEventWriter(em));
    },
    get matches() {
      return (matches ??= new CompetitionMatchWriter(em, tournamentWriter()));
    },
    get rosters() {
      return (rosters ??= new RosterSyncWriter(em));
    },
    get awards() {
      return (awards ??= new CompetitionAwardWriter(em));
    },
    get prizes() {
      return (prizes ??= new CompetitionPrizeWriter(em));
    },
    get lineups() {
      return (lineups ??= new CompetitionLineupWriter(em));
    },
  };
}

export class MikroOrmCompetitionTransaction implements CompetitionTransaction {
  constructor(private readonly em: EntityManager) {}
  async run<T>(work: (scope: CompetitionWriteScope) => Promise<T>): Promise<T> {
    return await this.em.transactional(async (em) => {
      const result = await work(lazyWriteScope(em));
      await em.flush();

      return result;
    });
  }
}
