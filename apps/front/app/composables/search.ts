import * as z from "zod";
import type { Player, Team } from "@sarpbc/types";
import { playerPath, teamPath } from "@sarpbc/utils";

const AGENT_SEARCH_LIMIT = 5;

export interface SearchResult {
  teams: Team[];
  players: Player[];
  total: { teams: number; players: number };
}

export const searchTeamsAndPlayers = async ({ query }: { query?: string }) => {
  try {
    return await apiFetch<SearchResult>(`/search`, {
      method: "GET",
      query: {
        q: query,
        type: "all",
      },
    });
  } catch {
    return { players: [], teams: [], total: { players: 0, teams: 0 } };
  }
};

export const useSearchAgentTool = () => {
  const localePath = useLocalePath();

  useAgentTool(
    defineAgentTool({
      annotations: { readOnlyHint: true },
      description:
        "Find Rocket League teams and players on sarpbc.org by name and get the path of their page. Use when the user names a team or player and you need their page, or their slug to compare players.",
      input: z.object({
        query: z.string().trim().min(1).describe("A team or player name, or part of it."),
      }),
      name: "search_teams_and_players",
    }),
    {
      execute: async ({ query }) => {
        const { teams, players } = await searchTeamsAndPlayers({ query });

        return {
          players: players.slice(0, AGENT_SEARCH_LIMIT).map((player) => ({
            name: player.name,
            path: localePath(playerPath(player.slug)),
            slug: player.slug,
            team: player.team?.name ?? null,
          })),
          teams: teams.slice(0, AGENT_SEARCH_LIMIT).map((team) => ({
            name: team.name,
            path: localePath(teamPath(team.slug)),
          })),
        };
      },
    },
  );
};
