import type { RequestContext } from "@mikro-orm/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { InjectOptions, LightMyRequestResponse } from "fastify";
import { z } from "zod";

export type Payload = InjectOptions["payload"];

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface JsonResponse extends Omit<LightMyRequestResponse, "json"> {
  json<T>(schema: z.ZodType<T>): T;
}

export type Request = (
  method: HttpMethod,
  url: string,
  payload?: Payload,
  cookie?: string,
  status?: number,
  headers?: Record<string, string>,
) => Promise<JsonResponse>;

export const toolProposal = z.object({ proposalId: z.string(), status: z.string() });

export type ToolProposal = z.infer<typeof toolProposal>;

export const reviewedProposal = z.object({
  id: z.string(),
  status: z.string(),
  entityId: z.string().nullable(),
});

export type ReviewedProposal = z.infer<typeof reviewedProposal>;

export const toolFailure = z.object({ error: z.literal(true) });

export type ToolFailure = z.infer<typeof toolFailure>;

export interface CallTool {
  (name: string, args: Payload): Promise<ToolProposal>;
  <T>(name: string, args: Payload, schema: z.ZodType<T>): Promise<T>;
}

export interface Review {
  (proposal: ToolProposal, action?: "approve" | "reject"): Promise<ReviewedProposal>;
  (proposal: ToolProposal, action: "approve" | "reject", refusedWith: number): Promise<void>;
}

export type Application = NestFastifyApplication;

export type Orm = InstanceType<typeof MikroORM>;

export type RequestContextType = typeof RequestContext;

/** UTF-16 code unit order, the order `Array.prototype.sort` uses by default. */
export const byText = (a: string, b: string): number => {
  if (a < b) return -1;

  return a > b ? 1 : 0;
};

export const byJoined = (a: unknown[], b: unknown[]): number => byText(a.join(), b.join());
