import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { log } from "evlog";
import { requestLogContext } from "../../logging/request-log-context";
import { ApplicationError } from "../../../domain/errors/application-error";
import type { FailureKind } from "../../../domain/errors/application-error";

const failureResponses = {
  conflict: { error: "Conflict", status: 409 },
  forbidden: { error: "Forbidden", status: 403 },
  integration: { error: "Internal Server Error", status: 500 },
  "invalid-input": { error: "Bad Request", status: 400 },
  "not-found": { error: "Not Found", status: 404 },
  unauthenticated: { error: "Unauthorized", status: 401 },
  unprocessable: { error: "Unprocessable Entity", status: 422 },
} satisfies Record<FailureKind, { status: number; error: string }>;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter<Error | HttpException> {
  catch(exception: Error | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (response.sent) {
      return;
    }

    if (exception instanceof ApplicationError) {
      const { status, error } = failureResponses[exception.kind];

      if (status >= 500) {
        log.error({
          component: AllExceptionsFilter.name,
          ...requestLogContext(request),
          error: exception,
          status,
        });
      }

      const body =
        exception.detail.code !== undefined && exception.detail.code !== ""
          ? exception.detail
          : { error, statusCode: status, ...exception.detail };

      void response.status(status).send(body);

      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      if (status >= 500) {
        log.error({
          component: AllExceptionsFilter.name,
          message: "HTTP 5xx response",
          ...requestLogContext(request),
          error: exception,
          status,
        });
      }

      const exceptionResponse = exception.getResponse();

      const body =
        exceptionResponse instanceof Object
          ? exceptionResponse
          : { message: exceptionResponse, statusCode: status };

      void response.status(status).send(body);

      return;
    }

    log.error({
      component: AllExceptionsFilter.name,
      message: "Unhandled exception",
      ...requestLogContext(request),
      error: exception instanceof Error ? exception : new Error(String(exception)),
    });

    void response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      message:
        "The server hit an unexpected error. Try again, or report this if it keeps happening.",
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
