import type { FastifyRequest } from "fastify";

import { createParamDecorator, ExecutionContext } from "@nestjs/common";

type FilesDecoratorData = undefined;

export const Files = createParamDecorator(
  async (_data: FilesDecoratorData, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();

    return req.storedFiles;
  },
);
