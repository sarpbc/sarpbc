import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserToken } from "src/common/types/usertoken.interface";
import { FastifyRequest } from "fastify";

export const CurrentUserId = createParamDecorator((data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<FastifyRequest & { user?: UserToken }>();
  return request.user?.id;
});
