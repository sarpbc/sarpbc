import type { ExecutionContext } from "@nestjs/common";
import { normalizeIp } from "@nestjs/throttler";
import {
  forwardedPublicClient,
  internalApiTokenMatches,
  isDirectLoopback,
  resolveClientAddress,
} from "@sarpbc/utils/client-address";
import type { ClientRequest } from "@sarpbc/utils/client-address";

const PUBLIC_LIMIT = 100;
const SSR_LIMIT = 400;

export function createClientThrottleOptions(internalApiToken: string | undefined) {
  return {
    skipIf: (context: ExecutionContext) =>
      isDirectLoopback(context.switchToHttp().getRequest<ClientRequest>()),
    getTracker: (request: ClientRequest) => {
      const address = internalApiTokenMatches(request, internalApiToken)
        ? (forwardedPublicClient(request) ?? resolveClientAddress(request))
        : resolveClientAddress(request);

      const normalized = normalizeIp(address);

      return internalApiTokenMatches(request, internalApiToken) ? `ssr:${normalized}` : normalized;
    },
    throttlers: [
      {
        name: "default",
        ttl: 60_000,
        limit: (context: ExecutionContext) =>
          internalApiTokenMatches(
            context.switchToHttp().getRequest<ClientRequest>(),
            internalApiToken,
          )
            ? SSR_LIMIT
            : PUBLIC_LIMIT,
      },
    ],
  };
}
