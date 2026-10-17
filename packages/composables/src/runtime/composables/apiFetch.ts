/**
 * Forwards SSR request cookies. Use instead of `$fetch` for authenticated API calls.
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
    const headers = new Headers(fetchOptions.headers);
    headers.set("cookie", event.node.req.headers.cookie);
    fetchOptions.headers = headers;
  }

  return $fetch<T, string>(`${config.public.apiBase}${url}`, fetchOptions);
};
