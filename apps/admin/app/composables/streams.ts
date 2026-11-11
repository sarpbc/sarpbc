import type { StreamInput, StreamsResponse } from "@sarpbc/types";

export async function getStreams(path: string): Promise<StreamsResponse> {
  return apiFetch<StreamsResponse>(path, { method: "GET" });
}

export async function setStreams(path: string, streams: StreamInput[]): Promise<StreamsResponse> {
  return apiFetch<StreamsResponse>(path, { method: "PUT", body: { streams } });
}
