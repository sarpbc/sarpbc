import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApplicationError } from "../../common/domain/errors/application-error";

const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on the server and was logged. Try again later, or ask an admin to check the logs.";

export const textToolResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});

export const toolErrorResult = (message: string): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/** Only application errors carry messages written for staff; anything else may leak internals. */
export const extractErrorMessage = (cause: unknown): string =>
  cause instanceof ApplicationError ? cause.message : INTERNAL_ERROR_MESSAGE;
