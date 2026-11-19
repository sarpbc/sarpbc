import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const textOf = (result: CallToolResult) => {
  const [block] = result.content;

  return block?.type === "text" ? block.text : "";
};

export const jsonOf = (result: CallToolResult) =>
  z.json().parse(JSON.parse(textOf(result) || "null"));
