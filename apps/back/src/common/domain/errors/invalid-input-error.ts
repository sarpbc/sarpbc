import { ApplicationError } from "./application-error";
import type { FailureDetail } from "./application-error";

export class InvalidInputError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("invalid-input", detail);
    this.name = "InvalidInputError";
  }
}
