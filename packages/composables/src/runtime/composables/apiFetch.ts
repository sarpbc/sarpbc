/**
 * Custom fetch wrapper that automatically handles SSR cookie forwarding
 * Use this instead of $fetch for authenticated API calls
 */
export const apiFetch = async <T>(
  url: string,
  opts: Parameters<typeof $fetch>[1] = {},
): Promise<T> => {
  const config = useRuntimeConfig();
  const event = import.meta.server ? useRequestEvent() : undefined;

  const fetchOptions: Parameters<typeof $fetch>[1] = {
    ...opts,
    credentials: "include",
  };

  if (event?.node?.req?.headers?.cookie) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      cookie: event.node.req.headers.cookie,
    } as HeadersInit;
  }

  return $fetch<T>(`${config.public.apiBase}${url}`, fetchOptions);
};
