import { log } from "evlog";
import type { PatUser } from "src/pat/pat.service";
import { roleHasPermission, StaffPermission } from "src/user/domain/staff-access";
import { extractErrorMessage, jsonToolResult, toolErrorResult } from "./tool-result";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

function denyIfMissingPermission(
  user: PatUser,
  permission: StaffPermission,
): CallToolResult | null {
  if (!roleHasPermission(user.role, permission)) {
    return toolErrorResult(
      `You need the ${permission} permission. Ask an admin to update your staff role.`,
    );
  }
  return null;
}

export async function runReadTool(handler: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const result = await handler();
    return jsonToolResult(result);
  } catch (error) {
    return toolErrorResult(extractErrorMessage(error));
  }
}

export async function runStaffReadTool(
  user: PatUser,
  permission: StaffPermission,
  handler: () => Promise<unknown>,
): Promise<CallToolResult> {
  const denied = denyIfMissingPermission(user, permission);
  if (denied) {
    return denied;
  }
  return runReadTool(handler);
}

export async function runWriteTool(
  user: PatUser,
  toolName: string,
  permission: StaffPermission,
  handler: () => Promise<{ result: unknown; entityId?: string }>,
): Promise<CallToolResult> {
  const denied = denyIfMissingPermission(user, permission);
  if (denied) {
    return denied;
  }

  try {
    const { result, entityId } = await handler();
    log.info({
      component: "McpWriteTool",
      userId: user.id,
      tool: toolName,
      entityId,
      message: `${toolName} completed`,
    });
    return jsonToolResult(result);
  } catch (error) {
    log.error({
      component: "McpWriteTool",
      userId: user.id,
      tool: toolName,
      message: `${toolName} failed`,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return toolErrorResult(extractErrorMessage(error));
  }
}
