import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from "@nestjs/common";
import { log } from "evlog";
import { AllExceptionsFilter } from "./all-exceptions.filter";

describe("AllExceptionsFilter", () => {
  const filter = new AllExceptionsFilter();

  function hostWith(
    send: jest.Mock,
    sent = false,
    request: { url: string; method: string; user?: { id: string; email: string } } = {
      url: "/news",
      method: "GET",
    },
  ): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ sent, status: jest.fn().mockReturnThis(), send }),
        getRequest: () => request,
      }),
    } as ArgumentsHost;
  }

  beforeEach(() => {
    (log.error as jest.Mock).mockClear();
  });

  it("preserves HttpException response bodies", () => {
    const send = jest.fn();
    filter.catch(new HttpException("Tournament not found", HttpStatus.NOT_FOUND), hostWith(send));
    expect(send).toHaveBeenCalledWith({
      statusCode: 404,
      message: "Tournament not found",
    });
    expect(log.error).not.toHaveBeenCalled();
  });

  it("logs HTTP 5xx with environment and user", () => {
    const send = jest.fn();
    filter.catch(
      new InternalServerErrorException("Cover image could not be stored."),
      hostWith(send, false, {
        url: "/storage/r2/upload",
        method: "POST",
        user: { id: "user-1", email: "editor@sarpbc.org" },
      }),
    );
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        component: AllExceptionsFilter.name,
        message: "HTTP 5xx response",
        path: "/storage/r2/upload",
        method: "POST",
        status: 500,
        userId: "user-1",
        userEmail: "editor@sarpbc.org",
        environment: expect.any(String),
      }),
    );
  });

  it("hides unexpected error details", () => {
    const send = jest.fn();
    filter.catch(new Error("secret stack"), hostWith(send));
    expect(send).toHaveBeenCalledWith({
      statusCode: 500,
      message:
        "The server hit an unexpected error. Try again, or report this if it keeps happening.",
    });
    expect(log.error).toHaveBeenCalled();
  });
});
