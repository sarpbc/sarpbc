import { Controller, Delete, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PatAuthGuard } from "src/pat/pat.guard";
import type { UserToken } from "src/common/types/usertoken.interface";
import { McpServerFactory } from "./mcp-server.factory";

const METHOD_NOT_ALLOWED_BODY = JSON.stringify({
  jsonrpc: "2.0",
  error: {
    code: -32000,
    message: "Method not allowed.",
  },
  id: null,
});

@Controller("mcp")
@UseGuards(PatAuthGuard)
export class McpController {
  constructor(private readonly mcpServerFactory: McpServerFactory) {}

  @Post()
  async handlePost(
    @Req() request: FastifyRequest & { user: UserToken },
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const server = this.mcpServerFactory.createServer(request.user);

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);

      reply.raw.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch {
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
  handleGet(@Res() reply: FastifyReply): void {
    reply.raw.writeHead(405, { "Content-Type": "application/json" }).end(METHOD_NOT_ALLOWED_BODY);
  }

  @Delete()
  handleDelete(@Res() reply: FastifyReply): void {
    reply.raw.writeHead(405, { "Content-Type": "application/json" }).end(METHOD_NOT_ALLOWED_BODY);
  }
}
