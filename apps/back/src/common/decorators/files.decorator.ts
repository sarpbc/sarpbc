import type { Storage } from "../../global";

import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";

export const Files = createParamDecorator(
  async (
    _data: unknown,
    ctx: ExecutionContext,
  ): Promise<null | Record<string, Storage.MultipartFile[]>> => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    return req.storedFiles;
  },
);
