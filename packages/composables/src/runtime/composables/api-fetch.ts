import {
  INTERNAL_API_HEADER,
  INTERNAL_CLIENT_HEADER,
  isNonEmptyString,
  resolveApiBase,
} from "@sarpbc/utils";
import type {
  NuxtRequestEvent,
  useRequestEvent as NuxtUseRequestEvent,
  useRuntimeConfig as NuxtUseRuntimeConfig,
} from "nuxt/app";

declare module "nuxt/schema" {
  interface RuntimeConfig {
    apiBaseServer: string;
    apiInternalToken: string;
  }

  interface PublicRuntimeConfig {
    apiBase: string;
  }
}

// Nuxt and Nitro both auto-import useRuntimeConfig, so it stays a global here.
declare const useRuntimeConfig: typeof NuxtUseRuntimeConfig;
declare const useRequestEvent: typeof NuxtUseRequestEvent;

interface ServerRequest {
  node: {
    req: {
      headers: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string | null };
    };
  };
}

function hasNodeRequest(event: NuxtRequestEvent): event is NuxtRequestEvent & ServerRequest {
  return "node" in event;
}

function apiBase(): string {
  const config = useRuntimeConfig();

  return resolveApiBase(config.public.apiBase, config.apiBaseServer, import.meta.server);
}

export function createApiClient() {
  return $fetch.create({
    baseURL: apiBase(),
    credentials: "include",
    async onRequest({ options }) {
      if (!import.meta.server) {
        return;
      }

      const headers = new Headers(options.headers);
      let event: ServerRequest | undefined;

      try {
        // Nitro routes call apiFetch with no Nuxt context: Nitro has no useRequestEvent,
        // so the call throws a ReferenceError.
        const requestEvent = useRequestEvent();
        event =
          requestEvent !== undefined && hasNodeRequest(requestEvent) ? requestEvent : undefined;
      } catch {
        event = undefined;
      }

      const cookie = event?.node.req.headers.cookie;

      if (!Array.isArray(cookie) && isNonEmptyString(cookie)) {
        headers.set("cookie", cookie);
      }

      const config = useRuntimeConfig();
      const token = config.apiInternalToken.trim();
      const serverBase = config.apiBaseServer.trim();

      if (isNonEmptyString(token) && isNonEmptyString(serverBase)) {
        headers.set(INTERNAL_API_HEADER, token);

        if (event !== undefined) {
          const { visitorAddressFromProxy } = await import("@sarpbc/utils/client-address");

          const visitor = visitorAddressFromProxy({
            socketAddress: event.node.req.socket?.remoteAddress,
            forwardedFor: event.node.req.headers["x-forwarded-for"],
            connectingIp: event.node.req.headers["cf-connecting-ip"],
          });

          if (isNonEmptyString(visitor)) {
            headers.set(INTERNAL_CLIENT_HEADER, visitor);
          }
        }
      }

      options.headers = headers;
    },
  });
}

export async function apiFetch<T>(
  url: string,
  opts: Parameters<typeof $fetch>[1] = {},
): Promise<T> {
  return await createApiClient()<T, string>(url, opts);
}
