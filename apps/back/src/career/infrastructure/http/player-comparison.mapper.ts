import type { CareerStint, CareerTitle, PlayerCareer, PlayerComparison } from "@sarpbc/types";
import type { Contract } from "../../../roster/domain/contract";
import { mapPlayer, mapTeamSummary } from "../../../roster/infrastructure/http/player.mapper";
import type { Tournament } from "../../../tournament/domain/tournament";
import { toEventRef } from "../../../tournament/domain/tournament-event";
import type { Career, Comparison } from "../../application/player-comparison.service";

const mapTitle = (tournament: Tournament): CareerTitle => ({
  id: tournament.id,
  name: tournament.name,
  slug: tournament.slug,
  endAt: tournament.endAt?.toISOString() ?? null,
  event: toEventRef(tournament.event),
});

const mapStint = (contract: Contract): CareerStint => ({
  role: contract.role,
  startDate: contract.startDate.toISOString(),
  endDate: contract.endDate?.toISOString() ?? null,
  team: mapTeamSummary(contract.team),
});

const mapCareer = (career: Career): PlayerCareer => ({
  player: mapPlayer(career.player),
  titles: career.titles.map(mapTitle),
  teams: career.contracts.map(mapStint),
  series: career.series,
  earnings: career.earnings,
  awards: career.awards,
  seasonAwards: career.seasonAwards,
});

export const mapComparison = (comparison: Comparison): PlayerComparison => ({
  a: mapCareer(comparison.a),
  b: mapCareer(comparison.b),
  headToHead: comparison.headToHead,
});
