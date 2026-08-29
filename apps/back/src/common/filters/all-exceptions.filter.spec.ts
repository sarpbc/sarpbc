import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { log } from "evlog";
import { AllExceptionsFilter } from "./all-exceptions.filter";

describe("AllExceptionsFilter", () => {
  const filter = new AllExceptionsFilter();

  function hostWith(send: jest.Mock, sent = false): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ sent, status: jest.fn().mockReturnThis(), send }),
        getRequest: () => ({ url: "/news", method: "GET" }),
      }),
    } as ArgumentsHost;
  }

  it("preserves HttpException response bodies", () => {
    const send = jest.fn();
    filter.catch(new HttpException("Tournament not found", HttpStatus.NOT_FOUND), hostWith(send));
    expect(send).toHaveBeenCalledWith({
      statusCode: 404,
      message: "Tournament not found",
    });
  });

  it("hides unexpected error details", () => {
    const send = jest.fn();
    filter.catch(new Error("secret stack"), hostWith(send));
    expect(send).toHaveBeenCalledWith({
      statusCode: 500,
      message: "Internal server error",
    });
    expect(log.error).toHaveBeenCalled();
  });
});
