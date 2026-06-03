import type { MaybeRef } from "vue";
import type { Player } from "~/types/player";

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

interface CreatePlayerDto {
  name: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  birthday?: string;
  imageUrl?: string;
}

interface UpdatePlayerDto {
  name?: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  birthday?: string;
  imageUrl?: string;
}

interface GetPlayerResponseDto {
  player?: Player;
}

interface GetPlayersResponseDto {
  players?: Player[];
  count?: number;
}

interface PlayerMutationResponseDto {
  player: Player;
}

export function usePlayer() {
  const $api = $fetch.create({
    baseURL: useRuntimeConfig().public.apiBase,
    credentials: "include",
  });

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

  function getPlayerById(id: MaybeRef<string>) {
    const idRef = toRef(id);
    return useAsyncData(
      () => `player-id-${idRef.value}`,
      () => $api<GetPlayerResponseDto>(`/player/${idRef.value}`).then((res) => res.player ?? null),
      {
        watch: [idRef],
        default: () => null as Player | null,
        getCachedData(key, nuxtApp) {
          return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
        },
      },
    );
  }

  function getAllPlayers(query?: MaybeRef<GetAllPlayersQueryDto | undefined>) {
    const params = computed<Record<string, string | number | undefined>>(() => {
      const q = toValue(query);
      const value: Record<string, string | number | undefined> = {
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

  async function createPlayer(body: CreatePlayerDto): Promise<Player> {
    const res = await $api<PlayerMutationResponseDto>("/player", {
      method: "POST",
      body,
    });
    return res.player;
  }

  async function updatePlayer(id: MaybeRef<string>, body: UpdatePlayerDto): Promise<Player> {
    const res = await $api<PlayerMutationResponseDto>(`/player/${toValue(id)}`, {
      method: "PATCH",
      body,
    });
    return res.player;
  }

  async function deletePlayer(id: MaybeRef<string>): Promise<void> {
    await $api(`/player/${toValue(id)}`, { method: "DELETE" });
  }

  return {
    getPlayerFromSlug,
    getPlayerById,
    getAllPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer,
  };
}
