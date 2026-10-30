import { resolveApiBase, shouldSendInternalApiToken, INTERNAL_API_HEADER } from "@sarpbc/utils";

type ApiRuntimeConfig = {
  apiBaseServer?: string;
  apiInternalToken?: string;
  public: {
    apiBase: string;
  };
};

function apiConfig(): ApiRuntimeConfig {
  return useRuntimeConfig();
}

/** Public API origin in the browser. Private Docker URL during SSR when configured. */
export function useApiBase(): string {
  const config = apiConfig();
  return resolveApiBase(config.public.apiBase, config.apiBaseServer, import.meta.server === true);
}

/**
 * Shared secret for Nuxt server calls to the private API origin.
 * Absent on the client, and absent when the request would leave for the public URL.
 */
export function useInternalApiHeaders(): Record<string, string> | undefined {
  if (!import.meta.server) {
    return undefined;
  }
  const config = apiConfig();
  const token = config.apiInternalToken?.trim();
  const serverBase = config.apiBaseServer?.trim();
  if (!token || !serverBase) {
    return undefined;
  }
  if (!shouldSendInternalApiToken(useApiBase(), undefined, serverBase)) {
    return undefined;
  }
  return { [INTERNAL_API_HEADER]: token };
}
