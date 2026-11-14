import { Controller, Delete, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { log } from "evlog";
import { PatAuthGuard } from "../../pat/infrastructure/http/pat.guard";
import type { PatUser } from "../../pat/application/pat.service";
import { McpServerFactory } from "./mcp-server.factory";

const METHOD_NOT_ALLOWED_BODY = {
  error: {
    code: -32_000,
    message: "Method not allowed.",
  },
  id: null,
  jsonrpc: "2.0",
};

@SkipThrottle()
@Controller("mcp")
@UseGuards(PatAuthGuard)
export class McpController {
  constructor(private readonly mcpServerFactory: McpServerFactory) {}

  @Post()
  async handlePost(
    @Req() request: FastifyRequest & { user: PatUser },
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const server = this.mcpServerFactory.createServer(request.user);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Attach before handleRequest: for the stateless JSON path the response
    // usually ends inside handleRequest, and cleanup must still run.
    reply.raw.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      log.error({
        component: McpController.name,
        error: error instanceof Error ? error : new Error(String(error)),
        message: "MCP request failed",
        userId: request.user.id,
      });

      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            error: {
              code: -32_603,
              message: "Internal server error",
            },
            id: null,
            jsonrpc: "2.0",
          }),
        );
      }
    }
  }

  @Get()
  @HttpCode(405)
  handleGet(): typeof METHOD_NOT_ALLOWED_BODY {
    return METHOD_NOT_ALLOWED_BODY;
  }

  @Delete()
  @HttpCode(405)
  handleDelete(): typeof METHOD_NOT_ALLOWED_BODY {
    return METHOD_NOT_ALLOWED_BODY;
  }
}
