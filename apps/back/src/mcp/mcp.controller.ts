import { Controller, Delete, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { log } from "evlog";
import { PatAuthGuard } from "src/pat/pat.guard";
import type { PatUser } from "src/pat/pat.service";
import { McpServerFactory } from "./mcp-server.factory";

const METHOD_NOT_ALLOWED_BODY = {
  jsonrpc: "2.0",
  error: {
    code: -32000,
    message: "Method not allowed.",
  },
  id: null,
};

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
        userId: request.user.id,
        message: "MCP request failed",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
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
