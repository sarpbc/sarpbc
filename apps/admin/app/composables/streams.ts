import type { StreamInput, StreamsResponse } from "@sarpbc/types";

export const getStreams = async (path: string): Promise<StreamsResponse> =>
  await apiFetch<StreamsResponse>(path, { method: "GET" });

export const setStreams = async (path: string, streams: StreamInput[]): Promise<StreamsResponse> =>
  await apiFetch<StreamsResponse>(path, { method: "PUT", body: { streams } });
