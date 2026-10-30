/**
 * Forwards SSR request cookies. Use instead of `$fetch` for authenticated API calls.
 * Server calls use the private API origin when `apiBaseServer` is set.
 */
export const apiFetch = async <T>(
  url: string,
  opts: Parameters<typeof $fetch>[1] = {},
): Promise<T> => {
  const event = import.meta.server ? useRequestEvent() : undefined;
  const baseURL = useApiBase();

  const fetchOptions: Parameters<typeof $fetch>[1] = {
    ...opts,
    credentials: "include",
  };

  const headers = new Headers(fetchOptions.headers);
  if (event?.node?.req?.headers?.cookie) {
    headers.set("cookie", event.node.req.headers.cookie);
  }
  const internal = useInternalApiHeaders();
  if (internal) {
    for (const [name, value] of Object.entries(internal)) {
      headers.set(name, value);
    }
  }
  fetchOptions.headers = headers;

  return $fetch<T, string>(`${baseURL}${url}`, fetchOptions);
};
