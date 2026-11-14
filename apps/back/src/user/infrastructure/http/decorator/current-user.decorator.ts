import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

export const CurrentUserId = createParamDecorator(
  (_data: undefined, context: ExecutionContext) =>
    context.switchToHttp().getRequest<FastifyRequest>().user?.id,
);
