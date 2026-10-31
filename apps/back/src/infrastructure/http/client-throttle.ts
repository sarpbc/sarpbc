import type { ExecutionContext } from "@nestjs/common";
import { normalizeIp } from "@nestjs/throttler";
import {
  forwardedPublicClient,
  internalApiTokenMatches,
  isDirectLoopback,
  resolveClientAddress,
  type ClientRequest,
} from "@sarpbc/utils/client-address";

const PUBLIC_LIMIT = 100;
const SSR_LIMIT = 400;

export type ClientRateLimits = {
  publicLimit: number;
  ssrLimit: number;
};

const DEFAULT_LIMITS: ClientRateLimits = {
  publicLimit: PUBLIC_LIMIT,
  ssrLimit: SSR_LIMIT,
};

export function createClientThrottleOptions(
  internalApiToken: string | undefined,
  limits: ClientRateLimits = DEFAULT_LIMITS,
) {
  return {
    skipIf: (context: ExecutionContext) =>
      isDirectLoopback(context.switchToHttp().getRequest() as ClientRequest),
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
            context.switchToHttp().getRequest() as ClientRequest,
            internalApiToken,
          )
            ? limits.ssrLimit
            : limits.publicLimit,
      },
    ],
  };
}
