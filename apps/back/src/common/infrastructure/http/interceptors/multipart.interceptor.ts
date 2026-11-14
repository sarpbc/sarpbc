import type { Observable } from "rxjs";
import type { CallHandler, ExecutionContext, NestInterceptor, Type } from "@nestjs/common";
import { HttpException, HttpStatus, mixin, PayloadTooLargeException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { createLogger } from "evlog";
import { z } from "zod";
import type { Storage } from "../fastify";
import { requestLogContext } from "../../logging/request-log-context";
import type { MultipartOptions } from "../multipart-file";
import { getFileFromPart, validateFile } from "../multipart-file";

const fieldValue = z.string().catch("");

type StoredFilesByField = Record<string, Storage.MultipartFile[]>;

type MultipartFormFields = Record<string, string>;

function isMultipartFileTooLarge(cause: unknown): boolean {
  if (!(cause instanceof Error)) {
    return false;
  }

  const code = "code" in cause ? cause.code : undefined;
  const statusCode = "statusCode" in cause ? cause.statusCode : undefined;

  return code === "FST_REQ_FILE_TOO_LARGE" || statusCode === 413;
}

export interface MultipartMessages {
  tooLarge: string;
  unreadable: string;
}

export function MultipartInterceptor(
  options: MultipartOptions,
  messages: MultipartMessages,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      const req = context.switchToHttp().getRequest<FastifyRequest>();

      if (!req.isMultipart()) {
        throw new HttpException("The request should be a form-data", HttpStatus.BAD_REQUEST);
      }

      const files: StoredFilesByField = {};
      const body: MultipartFormFields = {};

      try {
        for await (const part of req.parts()) {
          if (part.type !== "file") {
            body[part.fieldname] = fieldValue.parse(part.value);
            continue;
          }

          const file = await getFileFromPart(part);
          const validationResult = await validateFile(file, options);

          if (validationResult !== undefined) {
            throw new HttpException(validationResult, HttpStatus.UNPROCESSABLE_ENTITY);
          }

          const existing: Storage.MultipartFile[] | undefined = files[part.fieldname];
          files[part.fieldname] = [...(existing ?? []), file];
        }
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }

        const log = createLogger({
          component: "MultipartInterceptor",
          ...requestLogContext(req),
        });

        log.error(error instanceof Error ? error : new Error(String(error)));
        log.emit();

        if (isMultipartFileTooLarge(error)) {
          throw new PayloadTooLargeException(messages.tooLarge);
        }

        throw new HttpException(messages.unreadable, HttpStatus.BAD_REQUEST);
      }

      req.storedFiles = files;
      req.body = body;

      return next.handle();
    }
  }

  return mixin(MixinInterceptor);
}
