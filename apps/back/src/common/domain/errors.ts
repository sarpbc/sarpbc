export type FailureKind =
  | "invalid-input"
  | "not-found"
  | "conflict"
  | "forbidden"
  | "unauthenticated"
  | "unprocessable"
  | "integration";

export interface FailureDetail {
  message: string;
  code?: string;
}

export class ApplicationError extends Error {
  readonly detail: FailureDetail;

  constructor(
    readonly kind: FailureKind,
    detail: string | FailureDetail,
  ) {
    super(detail instanceof Object ? detail.message : detail);
    this.name = new.target.name;
    this.detail = detail instanceof Object ? detail : { message: detail };
  }
}

export class InvalidInputError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("invalid-input", detail);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("not-found", detail);
  }
}

export class ConflictError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("conflict", detail);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("forbidden", detail);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("unauthenticated", detail);
  }
}

export class IntegrationError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("integration", detail);
  }
}

export class UnprocessableError extends ApplicationError {
  constructor(detail: string | FailureDetail) {
    super("unprocessable", detail);
  }
}
