import { ApplicationError, type FailureDetail } from "./application-error";

export class AuthenticationError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("unauthenticated", detail);
    this.name = "AuthenticationError";
  }
}
