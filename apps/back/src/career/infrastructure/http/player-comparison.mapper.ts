import type { CareerStint, CareerTitle, PlayerCareer, PlayerComparison } from "@sarpbc/types";
import type { Contract } from "../../../roster/domain/contract";
import { mapPlayer, mapTeamSummary } from "../../../roster/infrastructure/http/player.mapper";
import type { Tournament } from "../../../tournament/domain/tournament";
import { toEventRef } from "../../../tournament/domain/tournament-event";
import type { Career, Comparison } from "../../application/player-comparison.service";

const mapTitle = (tournament: Tournament): CareerTitle => ({
  endAt: tournament.endAt?.toISOString() ?? null,
  event: toEventRef(tournament.event),
  id: tournament.id,
  name: tournament.name,
  slug: tournament.slug,
});

const mapStint = (contract: Contract): CareerStint => ({
  endDate: contract.endDate?.toISOString() ?? null,
  role: contract.role,
  startDate: contract.startDate.toISOString(),
  team: mapTeamSummary(contract.team),
});

const mapCareer = (career: Career): PlayerCareer => ({
  awards: career.awards,
  earnings: career.earnings,
  player: mapPlayer(career.player),
  seasonAwards: career.seasonAwards,
  series: career.series,
  teams: career.contracts.map(mapStint),
  titles: career.titles.map(mapTitle),
});

export const mapComparison = (comparison: Comparison): PlayerComparison => ({
  a: mapCareer(comparison.a),
  b: mapCareer(comparison.b),
  headToHead: comparison.headToHead,
});
