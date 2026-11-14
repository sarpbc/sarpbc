import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "../../../application/models/authenticated-user";

export interface AuthenticatedUserRequest extends FastifyRequest {
  user: AuthenticatedUser;
}
