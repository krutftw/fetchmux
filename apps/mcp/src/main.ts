import { FetchMux } from "@fetchmux/sdk";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const apiKey = process.env.FETCHMUX_API_KEY?.trim();
const client = new FetchMux({
  baseUrl: process.env.FETCHMUX_BASE_URL?.trim() || "http://127.0.0.1:8787/",
  fetch: globalThis.fetch.bind(globalThis),
  ...(apiKey ? { apiKey } : {}),
});
const { server } = createMcpServer({
  client,
  version: process.env.npm_package_version ?? "0.1.0",
});

await server.connect(new StdioServerTransport());
