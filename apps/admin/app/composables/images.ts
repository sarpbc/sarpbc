export type MediaImage = {
  id: string;
  imageId: string;
  url: string;
  source: string | null;
  sourceUrl: string | null;
  createdAt: string;
};

export type MediaImageListResponse = {
  data: MediaImage[];
  total: number;
  page: number;
  limit: number;
};

export async function listMediaImages({
  page = 0,
  limit = 25,
}: {
  page?: number;
  limit?: number;
} = {}): Promise<MediaImageListResponse> {
  const config = useRuntimeConfig();
  return $fetch<MediaImageListResponse>(`${config.public.apiBase}/images`, {
    credentials: "include",
    query: { page, limit },
  });
}
