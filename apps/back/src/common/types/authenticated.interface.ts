import { FastifyRequest } from "fastify";
import { UserToken } from "./usertoken.interface";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: UserToken;
}

export interface AuthenticatedUserRequest extends FastifyRequest {
  user: UserToken;
}
