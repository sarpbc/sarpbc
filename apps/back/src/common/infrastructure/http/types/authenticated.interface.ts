import { FastifyRequest } from "fastify";
import { AuthenticatedUser } from "../../../application/models/authenticated-user";

export interface AuthenticatedUserRequest extends FastifyRequest {
  user: AuthenticatedUser;
}
