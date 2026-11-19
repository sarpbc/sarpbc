import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApplicationError } from "../../common/domain/errors/application-error";

const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on the server and was logged. Try again later, or ask an admin to check the logs.";

export const textToolResult = (text: string) => {
  const result: CallToolResult = { content: [{ text, type: "text" }] };

  return result;
};

export const toolErrorResult = (message: string) => {
  const result: CallToolResult = { content: [{ text: message, type: "text" }], isError: true };

  return result;
};

/** Only application errors carry messages written for staff; anything else may leak internals. */
export const extractErrorMessage = (cause: unknown) =>
  cause instanceof ApplicationError ? cause.message : INTERNAL_ERROR_MESSAGE;
