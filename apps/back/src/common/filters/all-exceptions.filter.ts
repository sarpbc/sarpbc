import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { log } from "evlog";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (response.sent) {
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const body =
        typeof exceptionResponse === "string"
          ? { statusCode: status, message: exceptionResponse }
          : exceptionResponse;

      void response.status(status).send(body);
      return;
    }

    log.error({
      component: AllExceptionsFilter.name,
      message: "Unhandled exception",
      path: request.url,
      method: request.method,
      error: exception instanceof Error ? exception : new Error(String(exception)),
    });

    void response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}
