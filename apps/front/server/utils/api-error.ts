import { getApiErrorStatus } from "@sarpbc/utils";

interface ApiErrorMessages {
  notFound: string;
  badGateway: string;
}

// WARNING: keep the explicit type annotation; control flow treats a call as terminating only through an annotated binding.
export const rethrowApiError: (cause: unknown, messages: ApiErrorMessages) => never = (
  cause,
  messages,
) => {
  if (getApiErrorStatus(cause) === 404) {
    throw createError({ statusCode: 404, statusMessage: messages.notFound });
  }

  throw createError({ cause, statusCode: 502, statusMessage: messages.badGateway });
};
