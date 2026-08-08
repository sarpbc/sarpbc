import { log } from "evlog";
import type { StaffPermission } from "src/user/domain/staff-access";
import type { UserService } from "src/user/user.service";
import { extractErrorMessage, jsonToolResult, toolErrorResult } from "./tool-result";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export async function requirePermission(
  userService: UserService,
  userId: string,
  permission: StaffPermission,
): Promise<string | null> {
  const allowed = await userService.hasAnyPermission(userId, [permission]);
  if (!allowed) {
    return `You need the ${permission} permission. Ask an admin to update your staff role.`;
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

export async function runPermissionGatedTool(
  userService: UserService,
  userId: string,
  permission: StaffPermission,
  handler: () => Promise<unknown>,
): Promise<CallToolResult> {
  const denied = await requirePermission(userService, userId, permission);
  if (denied) {
    return toolErrorResult(denied);
  }

  try {
    const result = await handler();
    return jsonToolResult(result);
  } catch (error) {
    return toolErrorResult(extractErrorMessage(error));
  }
}

export async function runWriteTool(
  userService: UserService,
  userId: string,
  toolName: string,
  permission: StaffPermission,
  handler: () => Promise<{ result: unknown; entityId?: string }>,
): Promise<CallToolResult> {
  const denied = await requirePermission(userService, userId, permission);
  if (denied) {
    return toolErrorResult(denied);
  }

  try {
    const { result, entityId } = await handler();
    log.info({
      component: "McpWriteTool",
      userId,
      tool: toolName,
      entityId,
      message: `${toolName} completed`,
    });
    return jsonToolResult(result);
  } catch (error) {
    log.error({
      component: "McpWriteTool",
      userId,
      tool: toolName,
      message: `${toolName} failed`,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return toolErrorResult(extractErrorMessage(error));
  }
}
