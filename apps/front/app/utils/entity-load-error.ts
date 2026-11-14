import { createError } from "#imports";
import { getApiErrorStatus } from "@sarpbc/utils";

/**
 * Detail pages cannot render without their entity. A 404 (or no error at all) means it does not
 * exist; anything else is a failed load. `fatal` shows the error page on client navigation too,
 * instead of silently keeping the previous route.
 */
interface EntityLoadErrorMessages {
  notFound: string;
  failed: string;
}

// Control flow treats a call as terminating only through an explicitly annotated binding.
export const throwEntityLoadError: (cause: unknown, messages: EntityLoadErrorMessages) => never = (
  cause,
  messages,
) => {
  const status = cause === undefined || cause === null ? 404 : getApiErrorStatus(cause);
  const notFound = status === 404;
  throw createError({
    statusCode: notFound ? 404 : (status ?? 500),
    message: notFound ? messages.notFound : messages.failed,
    fatal: true,
  });
};
