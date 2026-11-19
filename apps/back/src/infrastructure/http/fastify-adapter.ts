import { FastifyAdapter } from "@nestjs/platform-fastify";

const TRUSTED_PROXIES = "loopback, uniquelocal";

export const createHttpAdapter = () => new FastifyAdapter({ trustProxy: TRUSTED_PROXIES });
