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
    this.name = "ApplicationError";
    this.detail = detail instanceof Object ? detail : { message: detail };
  }
}
