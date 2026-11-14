import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApplicationError } from "../../common/domain/errors/application-error";

const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on the server and was logged. Try again later, or ask an admin to check the logs.";

export function textToolResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

export function toolErrorResult(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/** Only application errors carry messages written for staff; anything else may leak internals. */
export function extractErrorMessage(cause: unknown): string {
  return cause instanceof ApplicationError ? cause.message : INTERNAL_ERROR_MESSAGE;
}
