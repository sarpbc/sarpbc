export function requestUrl(input: string | URL | Request | undefined): string {
  if (input instanceof Request) return input.url;

  return input?.toString() ?? "";
}
