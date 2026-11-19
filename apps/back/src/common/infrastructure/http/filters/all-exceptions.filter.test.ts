import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { AuthenticationError } from "../../../domain/errors/authentication-error";
import { ConflictError } from "../../../domain/errors/conflict-error";
import { ForbiddenError } from "../../../domain/errors/forbidden-error";
import { IntegrationError } from "../../../domain/errors/integration-error";
import { InvalidInputError } from "../../../domain/errors/invalid-input-error";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import { UnprocessableError } from "../../../domain/errors/unprocessable-error";
import { HttpException, HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { log } from "evlog";
import { AllExceptionsFilter } from "./all-exceptions.filter";

interface FakeRequest {
  url: string;
  method: string;
  user?: { id: string; email: string };
}

const NEWS_REQUEST: FakeRequest = {
  method: "GET",
  url: "/news",
};

interface FakeBody {
  statusCode?: number;
  error?: string;
  message: string;
  code?: string;
}

type Send = (body: FakeBody) => void;

const hostWith = (send: Mock<Send>, sent = false, request = NEWS_REQUEST) => {
  const response = { send, sent, status: () => response };

  return new ExecutionContextHost([request, response]);
};

describe(AllExceptionsFilter, () => {
  const filter = new AllExceptionsFilter();

  const logError = vi.spyOn(log, "error");

  beforeEach(() => {
    logError.mockClear();
  });

  it("preserves HttpException response bodies", () => {
    const send = vi.fn<Send>();
    filter.catch(new HttpException("Tournament not found", HttpStatus.NOT_FOUND), hostWith(send));
    expect(send).toHaveBeenCalledWith({
      message: "Tournament not found",
      statusCode: 404,
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it("logs HTTP 5xx with environment and user", () => {
    const send = vi.fn<Send>();
    filter.catch(
      new InternalServerErrorException("Cover image could not be stored."),
      hostWith(send, false, {
        method: "POST",
        url: "/storage/r2/upload",
        user: { email: "editor@sarpbc.org", id: "user-1" },
      }),
    );
    const [entry] = logError.mock.calls[0] ?? [];

    expect(entry).toMatchObject({
      component: AllExceptionsFilter.name,
      message: "HTTP 5xx response",
      method: "POST",
      path: "/storage/r2/upload",
      status: 500,
      userEmail: "editor@sarpbc.org",
      userId: "user-1",
    });
    expect(entry).toHaveProperty("environment", expect.any(String));
  });

  it.each([
    [new InvalidInputError("Invalid input"), 400, "Bad Request"],
    [new AuthenticationError("Sign in"), 401, "Unauthorized"],
    [new ForbiddenError("Denied"), 403, "Forbidden"],
    [new NotFoundError("Missing"), 404, "Not Found"],
    [new ConflictError("Duplicate"), 409, "Conflict"],
    [new UnprocessableError("Unknown team"), 422, "Unprocessable Entity"],
    [new IntegrationError("Provider unavailable"), 500, "Internal Server Error"],
  ])("translates application failure %p to HTTP %p", (failure, statusCode, error) => {
    const send = vi.fn<Send>();
    filter.catch(failure, hostWith(send));
    expect(send).toHaveBeenCalledWith({ error, message: failure.message, statusCode });
  });

  it("preserves coded business error payloads", () => {
    const send = vi.fn<Send>();
    filter.catch(
      new ConflictError({ code: "REPLY_ALREADY_REPORTED", message: "Already reported" }),
      hostWith(send),
    );
    expect(send).toHaveBeenCalledWith({
      code: "REPLY_ALREADY_REPORTED",
      message: "Already reported",
    });
  });

  it("hides unexpected error details", () => {
    const send = vi.fn<Send>();
    filter.catch(new Error("secret stack"), hostWith(send));
    expect(send).toHaveBeenCalledWith({
      message:
        "The server hit an unexpected error. Try again, or report this if it keeps happening.",
      statusCode: 500,
    });
    expect(logError).toHaveBeenCalledOnce();
    expect(logError.mock.calls[0]?.[0]).toMatchObject({
      component: AllExceptionsFilter.name,
      error: new Error("secret stack"),
      message: "Unhandled exception",
    });
  });
});
