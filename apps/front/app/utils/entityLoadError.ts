import { createError } from "#imports";
import { getApiErrorStatus } from "~/utils/apiError";

/**
 * Detail pages cannot render without their entity. A 404 (or no error at all) means it does not
 * exist; anything else is a failed load. `fatal` shows the error page on client navigation too,
 * instead of silently keeping the previous route.
 */
export function throwEntityLoadError(
  cause: unknown,
  messages: { notFound: string; failed: string },
): never {
  const status = cause ? getApiErrorStatus(cause) : 404;
  const notFound = status === 404;
  throw createError({
    statusCode: notFound ? 404 : (status ?? 500),
    message: notFound ? messages.notFound : messages.failed,
    fatal: true,
  });
}
