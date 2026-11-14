import { ApplicationError } from "./application-error";
import type { FailureDetail } from "./application-error";

export class ConflictError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("conflict", detail);
    this.name = "ConflictError";
  }
}
