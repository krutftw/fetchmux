import {
  type RoutePreview,
  type SearchRequestInput,
  type SearchResponse,
  searchRequestSchema,
} from "@fetchmux/core";
import { type FetchMux, FetchMuxClientError } from "@fetchmux/sdk";
import { McpServer, type RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type FetchMuxClient = Pick<FetchMux, "search" | "preview">;

export interface ToolHandlers {
  searchWeb(request: SearchRequestInput): Promise<CallToolResult>;
  previewRoute(request: SearchRequestInput): Promise<CallToolResult>;
}

export interface CreateMcpServerOptions {
  readonly client: FetchMuxClient;
  readonly version: string;
}

export interface FetchMuxMcpServer {
  readonly server: McpServer;
  readonly registeredTools: {
    readonly searchWeb: RegisteredTool;
    readonly previewRoute: RegisteredTool;
  };
}

export function createToolHandlers(client: FetchMuxClient): ToolHandlers {
  return {
    searchWeb: async (request) => {
      try {
        return textResult(await client.search(request));
      } catch (error) {
        return toolError(error);
      }
    },
    previewRoute: async (request) => {
      try {
        return textResult(await client.preview(request));
      } catch (error) {
        return toolError(error);
      }
    },
  };
}

export function createMcpServer(options: CreateMcpServerOptions): FetchMuxMcpServer {
  const server = new McpServer({ name: "fetchmux", version: options.version });
  const handlers = createToolHandlers(options.client);
  const searchWeb = server.registerTool(
    "search_web",
    {
      title: "Search the web through FetchMux",
      description:
        "Route a web retrieval request by evidence quality, cost, latency, freshness, and hard policy limits.",
      inputSchema: searchRequestSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (request) => handlers.searchWeb(request),
  );
  const previewRoute = server.registerTool(
    "preview_search_route",
    {
      title: "Preview a FetchMux search route",
      description:
        "Show eligible retrieval providers, estimated cost, component scores, and reason codes without calling a provider.",
      inputSchema: searchRequestSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (request) => handlers.previewRoute(request),
  );
  return { server, registeredTools: { searchWeb, previewRoute } };
}

function textResult(value: SearchResponse | RoutePreview): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
  };
}

function toolError(error: unknown): CallToolResult {
  const safeError =
    error instanceof FetchMuxClientError
      ? {
          code: error.code,
          message: error.message,
          ...(error.traceId === undefined ? {} : { traceId: error.traceId }),
        }
      : {
          code: "MCP_TOOL_ERROR",
          message: "FetchMux could not complete the tool request",
        };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ error: safeError }) }],
  };
}
