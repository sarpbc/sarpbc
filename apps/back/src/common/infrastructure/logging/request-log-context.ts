import type { FastifyRequest } from "fastify";
import { nodeEnvironment } from "../../../infrastructure/config/env.validation";

export const requestLogContext = (request: FastifyRequest) => ({
  environment: nodeEnvironment(),
  path: request.url,
  method: request.method,
  userId: request.user?.id,
  userEmail: request.user?.email,
});
