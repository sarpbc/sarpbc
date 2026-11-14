import { getApiErrorStatus } from "@sarpbc/utils";

export function rethrowApiError(
  cause: unknown,
  messages: { notFound: string; badGateway: string },
): never {
  if (getApiErrorStatus(cause) === 404) {
    throw createError({ statusCode: 404, statusMessage: messages.notFound });
  }

  throw createError({ statusCode: 502, statusMessage: messages.badGateway, cause });
}
