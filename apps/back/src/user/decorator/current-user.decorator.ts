import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserToken } from "src/common/types/usertoken.interface";
import { FastifyRequest } from "fastify";

type CurrentUserDecoratorData = undefined;

export const CurrentUserId = createParamDecorator(
  (_data: CurrentUserDecoratorData, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: UserToken }>();
    return request.user?.id;
  },
);
