import { ApplicationError, type FailureDetail } from "./application-error";

export class IntegrationError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("integration", detail);
    this.name = "IntegrationError";
  }
}
