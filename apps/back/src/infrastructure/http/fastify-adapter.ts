import { FastifyAdapter } from "@nestjs/platform-fastify";

/**
 * Trust only loopback and private-network proxies (Traefik on the overlay).
 * A public client is not a trusted hop, so a forged X-Forwarded-For is ignored.
 */
export const TRUSTED_PROXIES = "loopback, uniquelocal";

export function createHttpAdapter(): FastifyAdapter {
  return new FastifyAdapter({ trustProxy: TRUSTED_PROXIES });
}
