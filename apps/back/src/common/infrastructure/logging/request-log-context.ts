import type { FastifyRequest } from "fastify";
import { nodeEnvironment } from "../../../infrastructure/config/env.validation";

export const requestLogContext = (request: FastifyRequest) => ({
  environment: nodeEnvironment(),
  method: request.method,
  path: request.url,
  userEmail: request.user?.email,
  userId: request.user?.id,
});
