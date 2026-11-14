import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
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
  url: "/news",
  method: "GET",
};

function hostWith(send: Mock, sent = false, request = NEWS_REQUEST): ExecutionContextHost {
  return new ExecutionContextHost([request, { sent, status: vi.fn().mockReturnThis(), send }]);
}

describe("AllExceptionsFilter", () => {
  const filter = new AllExceptionsFilter();

  const logError = vi.spyOn(log, "error");

  beforeEach(() => {
    logError.mockClear();
  });

  it("preserves HttpException response bodies", () => {
    const send = vi.fn();
    filter.catch(new HttpException("Tournament not found", HttpStatus.NOT_FOUND), hostWith(send));
    expect(send).toHaveBeenCalledWith({
      statusCode: 404,
      message: "Tournament not found",
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it("logs HTTP 5xx with environment and user", () => {
    const send = vi.fn();
    filter.catch(
      new InternalServerErrorException("Cover image could not be stored."),
      hostWith(send, false, {
        url: "/storage/r2/upload",
        method: "POST",
        user: { id: "user-1", email: "editor@sarpbc.org" },
      }),
    );
    const [entry] = logError.mock.calls[0] ?? [];

    expect(entry).toMatchObject({
      component: AllExceptionsFilter.name,
      message: "HTTP 5xx response",
      path: "/storage/r2/upload",
      method: "POST",
      status: 500,
      userId: "user-1",
      userEmail: "editor@sarpbc.org",
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
    const send = vi.fn();
    filter.catch(failure, hostWith(send));
    expect(send).toHaveBeenCalledWith({ statusCode, error, message: failure.message });
  });

  it("preserves coded business error payloads", () => {
    const send = vi.fn();
    filter.catch(
      new ConflictError({ message: "Already reported", code: "REPLY_ALREADY_REPORTED" }),
      hostWith(send),
    );
    expect(send).toHaveBeenCalledWith({
      message: "Already reported",
      code: "REPLY_ALREADY_REPORTED",
    });
  });

  it("hides unexpected error details", () => {
    const send = vi.fn();
    filter.catch(new Error("secret stack"), hostWith(send));
    expect(send).toHaveBeenCalledWith({
      statusCode: 500,
      message:
        "The server hit an unexpected error. Try again, or report this if it keeps happening.",
    });
    expect(logError).toHaveBeenCalled();
  });
});
