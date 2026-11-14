import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { StaffPermission } from "@sarpbc/types";
import { log } from "evlog";
import { z } from "zod";
import type { PatUser } from "../../pat/application/pat.service";
import { roleHasPermission } from "../../user/domain/staff-access";
import { extractErrorMessage, textToolResult, toolErrorResult } from "./tool-result";

type ToolInput<Fields extends Record<string, z.ZodType>> = z.infer<z.ZodObject<Fields>>;

export type ToolArguments = ToolInput<Record<string, z.ZodType>>;

interface ToolSpec<Fields extends Record<string, z.ZodType>> {
  name: string;
  description: string;
  input: Fields;
}

/** A JSON-serialisable tool payload. */
export type ToolData = object;

export interface ToolWrite<Result = object> {
  result: Result;
  entityId?: string;
  sourceUrl?: string;
}

interface ReadToolSpec<Fields extends Record<string, z.ZodType>> extends ToolSpec<Fields> {
  write?: false;
  /** Without a permission, any valid token may read. With several, any one of them is enough. */
  permission?: StaffPermission | readonly StaffPermission[];
  handler: (input: ToolInput<Fields>, user: PatUser) => Promise<ToolData>;
}

interface WriteToolSpec<Fields extends Record<string, z.ZodType>> extends ToolSpec<Fields> {
  write: true;
  permission: StaffPermission;
  handler: (input: ToolInput<Fields>, user: PatUser) => Promise<ToolWrite>;
}

export interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, z.ZodType>;
  run(user: PatUser, input: ToolArguments): Promise<CallToolResult>;
}

function listOr(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} or ${items.at(-1)}` : items.join("");
}

function asError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/**
 * The one way to declare an MCP tool: it owns the permission gate, the logging and the
 * "Requires …" description suffix, so a tool states its name and permission once.
 */
export function defineTool<Fields extends Record<string, z.ZodType>>(
  spec: ReadToolSpec<Fields> | WriteToolSpec<Fields>,
): McpTool {
  const permissions = [spec.permission ?? []].flat();

  return {
    name: spec.name,
    description:
      permissions.length > 0
        ? `${spec.description} Requires ${listOr(permissions)}.`
        : spec.description,
    inputSchema: spec.input,
    async run(user, input) {
      const allowed =
        permissions.length === 0 ||
        permissions.some((permission) => roleHasPermission(user.role, permission));

      if (!allowed) {
        return toolErrorResult(
          `You need the ${permissions.join(" or ")} permission. Ask an admin to update your staff role.`,
        );
      }

      try {
        const parsed = z.object(spec.input).safeParse(input);

        if (!parsed.success) {
          return toolErrorResult(z.prettifyError(parsed.error));
        }

        const fields = parsed.data;

        if (spec.write !== true) {
          return textToolResult(JSON.stringify(await spec.handler(fields, user), null, 2));
        }

        const { result, entityId, sourceUrl } = await spec.handler(fields, user);
        log.info({
          component: "McpTool",
          userId: user.id,
          tool: spec.name,
          entityId,
          sourceUrl,
          message: `${spec.name} completed`,
        });

        return textToolResult(JSON.stringify(result, null, 2));
      } catch (error) {
        log.error({
          component: "McpTool",
          userId: user.id,
          tool: spec.name,
          message: `${spec.name} failed`,
          error: asError(error),
        });

        return toolErrorResult(extractErrorMessage(error));
      }
    },
  };
}

export function registerTools(server: McpServer, user: PatUser, tools: readonly McpTool[]): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (input) => await tool.run(user, input),
    );
  }
}
