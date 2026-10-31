import { INTERNAL_API_HEADER, INTERNAL_CLIENT_HEADER, resolveApiBase } from "@sarpbc/utils";

type PrivateApiConfig = {
  apiBaseServer?: string;
  apiInternalToken?: string;
  public: {
    apiBase: string;
  };
};

type ServerRequest = {
  node: {
    req: {
      headers: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string | null };
    };
  };
};

function privateApiConfig(): PrivateApiConfig {
  return useRuntimeConfig() as PrivateApiConfig;
}

function apiBase(): string {
  const config = privateApiConfig();
  return resolveApiBase(config.public.apiBase, config.apiBaseServer, import.meta.server === true);
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
        // @ts-ignore
        event = useRequestEvent();
      } catch {
        event = undefined;
      }
      const cookie = event?.node.req.headers.cookie;
      if (cookie && !Array.isArray(cookie)) {
        headers.set("cookie", cookie);
      }
      const config = privateApiConfig();
      const token = config.apiInternalToken?.trim();
      const serverBase = config.apiBaseServer?.trim();
      if (token && serverBase) {
        headers.set(INTERNAL_API_HEADER, token);
        if (event) {
          const { visitorAddressFromProxy } = await import("@sarpbc/utils/client-address");
          const visitor = visitorAddressFromProxy({
            socketAddress: event.node.req.socket?.remoteAddress,
            forwardedFor: event.node.req.headers["x-forwarded-for"],
            connectingIp: event.node.req.headers["cf-connecting-ip"],
          });
          if (visitor) {
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
  return createApiClient()<T, string>(url, opts);
}
