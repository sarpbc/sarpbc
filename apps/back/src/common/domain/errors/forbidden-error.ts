import { ApplicationError } from "./application-error";
import type { FailureDetail } from "./application-error";

export class ForbiddenError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("forbidden", detail);
    this.name = "ForbiddenError";
  }
}
