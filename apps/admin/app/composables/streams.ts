import type { StreamInput, StreamsResponse } from "@sarpbc/types";

export const getStreams = async (path: string) =>
  await apiFetch<StreamsResponse>(path, { method: "GET" });

export const setStreams = async (path: string, streams: StreamInput[]) =>
  await apiFetch<StreamsResponse>(path, { body: { streams }, method: "PUT" });
