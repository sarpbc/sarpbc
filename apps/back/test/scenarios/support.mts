import type { RequestContext } from "@mikro-orm/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { InjectOptions, LightMyRequestResponse } from "fastify";

export type Payload = InjectOptions["payload"];

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface JsonResponse extends Omit<LightMyRequestResponse, "json"> {
  json<T>(): T;
}

export type Request = (
  method: HttpMethod,
  url: string,
  payload?: Payload,
  cookie?: string,
  status?: number,
  headers?: Record<string, string>,
) => Promise<JsonResponse>;

export interface ToolProposal {
  proposalId: string;
  status: string;
}

export interface ReviewedProposal {
  id: string;
  status: string;
  entityId: string;
}

export interface ToolFailure {
  error: true;
}

export type CallTool = <T = ToolProposal>(name: string, args: Payload) => Promise<T>;

export type Review = (
  proposal: ToolProposal,
  action?: "approve" | "reject",
  status?: number,
) => Promise<ReviewedProposal>;

export type Application = NestFastifyApplication;

export type Orm = InstanceType<typeof MikroORM>;

export type RequestContextType = typeof RequestContext;
