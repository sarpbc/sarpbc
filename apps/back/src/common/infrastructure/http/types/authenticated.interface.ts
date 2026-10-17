import { FastifyRequest } from "fastify";
import { UserToken } from "../../../application/models/user-token";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: UserToken;
}

export interface AuthenticatedUserRequest extends FastifyRequest {
  user: UserToken;
}
