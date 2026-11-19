import type { CareerStint, CareerTitle, PlayerCareer, PlayerComparison } from "@sarpbc/types";
import type { Contract } from "../../../roster/domain/contract";
import { mapPlayer, mapTeamSummary } from "../../../roster/infrastructure/http/player.mapper";
import type { Tournament } from "../../../tournament/domain/tournament";
import { toEventRef } from "../../../tournament/domain/tournament-event";
import type { Career, Comparison } from "../../application/player-comparison.service";

const mapTitle = (tournament: Tournament) =>
  ({
    endAt: tournament.endAt?.toISOString() ?? null,
    event: toEventRef(tournament.event),
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
  }) satisfies CareerTitle;

const mapStint = (contract: Contract) =>
  ({
    endDate: contract.endDate?.toISOString() ?? null,
    role: contract.role,
    startDate: contract.startDate.toISOString(),
    team: mapTeamSummary(contract.team),
  }) satisfies CareerStint;

const mapCareer = (career: Career) =>
  ({
    awards: career.awards,
    earnings: career.earnings,
    player: mapPlayer(career.player),
    seasonAwards: career.seasonAwards,
    series: career.series,
    teams: career.contracts.map(mapStint),
    titles: career.titles.map(mapTitle),
  }) satisfies PlayerCareer;

export const mapComparison = (comparison: Comparison) =>
  ({
    a: mapCareer(comparison.a),
    b: mapCareer(comparison.b),
    headToHead: comparison.headToHead,
  }) satisfies PlayerComparison;
