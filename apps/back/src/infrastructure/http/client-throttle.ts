import type { ExecutionContext } from "@nestjs/common";
import { normalizeIp } from "@nestjs/throttler";
import {
  internalApiTokenMatches,
  isDirectLoopback,
  resolveClientAddress,
  type ClientRequest,
} from "./client-address";

function asClientRequest(request: object): ClientRequest {
  return request as ClientRequest;
}

export function clientThrottleTracking(internalApiToken: string | undefined) {
  return {
    skipIf: (context: ExecutionContext) => {
      const request = asClientRequest(context.switchToHttp().getRequest());
      return isDirectLoopback(request) || internalApiTokenMatches(request, internalApiToken);
    },
    getTracker: (request: Record<string, unknown>) =>
      normalizeIp(resolveClientAddress(asClientRequest(request))),
  };
}

export function createClientThrottleOptions(internalApiToken: string | undefined) {
  return {
    ...clientThrottleTracking(internalApiToken),
    throttlers: [
      {
        name: "default",
        ttl: 60_000,
        limit: 100,
      },
    ],
  };
}
