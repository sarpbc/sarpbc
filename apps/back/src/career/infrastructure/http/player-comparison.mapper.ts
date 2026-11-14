import type { CareerStint, CareerTitle, PlayerCareer, PlayerComparison } from "@sarpbc/types";
import type { Contract } from "../../../roster/domain/contract";
import { mapPlayer, mapTeamSummary } from "../../../roster/infrastructure/http/player.mapper";
import type { Tournament } from "../../../tournament/domain/tournament";
import { toEventRef } from "../../../tournament/domain/tournament-event";
import type { Career, Comparison } from "../../application/player-comparison.service";

function mapTitle(tournament: Tournament): CareerTitle {
  return {
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
    endAt: tournament.endAt?.toISOString() ?? null,
    event: toEventRef(tournament.event),
  };
}

function mapStint(contract: Contract): CareerStint {
  return {
    role: contract.role,
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate?.toISOString() ?? null,
    team: mapTeamSummary(contract.team),
  };
}

function mapCareer(career: Career): PlayerCareer {
  return {
    player: mapPlayer(career.player),
    titles: career.titles.map(mapTitle),
    teams: career.contracts.map(mapStint),
    series: career.series,
    earnings: career.earnings,
    awards: career.awards,
    seasonAwards: career.seasonAwards,
  };
}

export function mapComparison(comparison: Comparison): PlayerComparison {
  return {
    a: mapCareer(comparison.a),
    b: mapCareer(comparison.b),
    headToHead: comparison.headToHead,
  };
}
