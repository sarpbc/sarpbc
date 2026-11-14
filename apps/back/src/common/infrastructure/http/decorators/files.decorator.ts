import type { FastifyRequest } from "fastify";

import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

type FilesDecoratorData = undefined;

export const Files = createParamDecorator(
  async (
    _data: FilesDecoratorData,
    ctx: ExecutionContext,
  ): Promise<null | FastifyRequest["storedFiles"]> => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();

    return req.storedFiles;
  },
);
