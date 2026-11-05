import type { MaybeRef } from "vue";
import type { Player } from "~/types/player";
import { createApiClient } from "~/utils/apiFetch";

interface GetAllPlayersQueryDto {
  limit?: number;
  start?: string;
  search?: string;
  offset?: number;
}

interface GetAllPlayersResultDto {
  players: Player[];
  total: number;
}

interface GetPlayerResponseDto {
  player?: Player;
}

interface GetPlayersResponseDto {
  players?: Player[];
  count?: number;
}

interface PlayerListParams {
  limit: number;
  offset?: number;
  start?: string;
  name?: string;
}

export function usePlayer() {
  const $api = createApiClient();

  function getPlayerFromSlug(slug: MaybeRef<string>) {
    const slugRef = toRef(slug);
    return useAsyncData(
      () => `player-slug-${slugRef.value}`,
      () =>
        $api<GetPlayerResponseDto>(`/player/slug/${slugRef.value}`).then(
          (res) => res.player ?? null,
        ),
      { watch: [slugRef], default: () => null as Player | null },
    );
  }

  function getAllPlayers(query?: MaybeRef<GetAllPlayersQueryDto | undefined>) {
    const params = computed(() => {
      const q = toValue(query);
      const value: PlayerListParams = {
        limit: q?.limit ?? 50,
      };
      if (q?.offset && q.offset > 0) value.offset = q.offset;
      if (q?.start) value.start = q.start;
      else if (q?.search) value.name = q.search;
      return value;
    });

    return useAsyncData(
      () => `players-${JSON.stringify(params.value)}`,
      () =>
        $api<GetPlayersResponseDto>("/player", { params: params.value }).then((res) => {
          const players = res.players ?? [];
          return {
            players,
            total: res.count ?? players.length,
          } satisfies GetAllPlayersResultDto;
        }),
      {
        watch: [params],
        default: () => ({ players: [] as Player[], total: 0 }),
      },
    );
  }

  return {
    getPlayerFromSlug,
    getAllPlayers,
  };
}
