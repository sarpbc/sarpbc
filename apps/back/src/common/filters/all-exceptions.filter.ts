import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { log } from "evlog";
import { requestLogContext } from "../request-log-context";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter<Error | HttpException> {
  catch(exception: Error | HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (response.sent) {
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        log.error({
          component: AllExceptionsFilter.name,
          message: "HTTP 5xx response",
          ...requestLogContext(request),
          status,
          error: exception,
        });
      }

      const exceptionResponse = exception.getResponse();
      const body =
        exceptionResponse instanceof Object
          ? exceptionResponse
          : { statusCode: status, message: exceptionResponse };

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
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        "The server hit an unexpected error. Try again, or report this if it keeps happening.",
    });
  }
}
