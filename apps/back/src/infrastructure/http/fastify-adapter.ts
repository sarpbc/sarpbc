import { FastifyAdapter } from "@nestjs/platform-fastify";

export const TRUSTED_PROXIES = "loopback, uniquelocal";

export function createHttpAdapter(): FastifyAdapter {
  return new FastifyAdapter({ trustProxy: TRUSTED_PROXIES });
}
