import type { FastifyRequest } from "fastify";

export function currentEnvironment(): string {
  return process.env.NODE_ENV ?? "development";
}

export function requestLogContext(request: FastifyRequest) {
  return {
    environment: currentEnvironment(),
    path: request.url,
    method: request.method,
    userId: request.user?.id,
    userEmail: request.user?.email,
  };
}
