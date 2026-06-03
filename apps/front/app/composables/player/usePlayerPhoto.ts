import type { MaybeRef } from "vue";
import { toValue } from "vue";

interface AddPlayerPhotoDto {
  photoUrl: string;
}

interface DeletePlayerPhotoDto {
  photoUrl: string;
}

interface GetPlayerPhotosResponseDto {
  photos?: string[];
}

interface AddPlayerPhotoResponseDto {
  photos?: string[];
  photoUrl?: string;
}

export function usePlayerPhoto() {
  const $api = $fetch.create({
    baseURL: useRuntimeConfig().public.apiBase,
    credentials: "include",
  });

  function getPlayerPhotos(playerId: MaybeRef<string>) {
    return useAsyncData(
      () => `player-photos-${toValue(playerId)}`,
      () =>
        $api<GetPlayerPhotosResponseDto>(`/player/${toValue(playerId)}/photo`).then(
          (res) => res.photos ?? [],
        ),
      {
        watch: [() => toValue(playerId)],
        default: () => [] as string[],
      },
    );
  }

  async function addPlayerPhoto(
    playerId: MaybeRef<string>,
    body: AddPlayerPhotoDto,
  ): Promise<string> {
    const res = await $api<AddPlayerPhotoResponseDto>(`/player/${toValue(playerId)}/photo`, {
      method: "POST",
      body,
    });

    if (res.photoUrl) {
      return res.photoUrl;
    }

    if (res.photos && res.photos.length > 0) {
      return res.photos[res.photos.length - 1] as string;
    }

    return body.photoUrl;
  }

  async function deletePlayerPhoto(
    playerId: MaybeRef<string>,
    body: DeletePlayerPhotoDto,
  ): Promise<void> {
    await $api(`/player/${toValue(playerId)}/photo`, {
      method: "DELETE",
      body,
    });
  }

  return {
    getPlayerPhotos,
    addPlayerPhoto,
    deletePlayerPhoto,
  };
}
