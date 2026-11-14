import { ApplicationError, type FailureDetail } from "./application-error";

export class NotFoundError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("not-found", detail);
    this.name = "NotFoundError";
  }
}
