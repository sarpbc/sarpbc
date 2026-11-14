import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";

export const CurrentUserId = createParamDecorator(
  (_data: undefined, context: ExecutionContext) =>
    context.switchToHttp().getRequest<FastifyRequest>().user?.id,
);
