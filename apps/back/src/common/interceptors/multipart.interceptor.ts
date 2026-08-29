import { Observable } from "rxjs";
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  mixin,
  NestInterceptor,
  PayloadTooLargeException,
  Type,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { createLogger } from "evlog";
import type { Storage } from "../../global";
import { requestLogContext } from "../request-log-context";
import { getFileFromPart, MultipartOptions, validateFile } from "../utils/file.util";

interface StoredFilesByField {
  [fieldname: string]: Storage.MultipartFile[];
}

interface MultipartFormFields {
  [fieldname: string]: string;
}

function isMultipartFileTooLarge(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? error.code : undefined;
  const statusCode = "statusCode" in error ? error.statusCode : undefined;
  return code === "FST_REQ_FILE_TOO_LARGE" || statusCode === 413;
}

export function MultipartInterceptor(options: MultipartOptions = {}): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const req = context.switchToHttp().getRequest<FastifyRequest>();

      if (!req.isMultipart())
        throw new HttpException("The request should be a form-data", HttpStatus.BAD_REQUEST);

      const files: StoredFilesByField = {};
      const body: MultipartFormFields = {};

      try {
        for await (const part of req.parts()) {
          if (part.type !== "file") {
            body[part.fieldname] = part.value == null ? "" : String(part.value);
            continue;
          }

          const file = await getFileFromPart(part);
          const validationResult = await validateFile(file, options);

          if (validationResult)
            throw new HttpException(validationResult, HttpStatus.UNPROCESSABLE_ENTITY);

          files[part.fieldname] = files[part.fieldname] || [];
          files[part.fieldname].push(file);
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
          throw new PayloadTooLargeException(
            "Cover image must be 5 MB or smaller. Compress the JPEG or pick another file.",
          );
        }

        throw new HttpException(
          "The image could not be read. Try a JPEG, PNG, WebP, or GIF under 5 MB.",
          HttpStatus.BAD_REQUEST,
        );
      }

      req.storedFiles = files;
      req.body = body;

      return next.handle();
    }
  }

  return mixin(MixinInterceptor);
}
