import type { CountryDetail, CountrySummary } from "@sarpbc/types";
import type { NationalityCount } from "../../../roster/application/ports";
import { mapPlayer, mapTeamSummary } from "../../../roster/infrastructure/http/player.mapper";
import { mapMatchListItem } from "../../../tournament/infrastructure/http/match-list.mapper";
import type { CountryPage } from "../../application/country.service";

export const mapCountrySummary = ({ code, players }: NationalityCount): CountrySummary => ({
  code,
  playerCount: players,
});

export const mapCountry = (page: CountryPage): CountryDetail => ({
  code: page.code,
  players: page.players.map((player) => mapPlayer(player)),
  teams: page.teams.map(mapTeamSummary),
  matches: page.matches.map(mapMatchListItem),
  matchTotal: page.matchTotal,
});
