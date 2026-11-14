import { ApplicationError } from "./application-error";
import type { FailureDetail } from "./application-error";

export class UnprocessableError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("unprocessable", detail);
    this.name = "UnprocessableError";
  }
}
