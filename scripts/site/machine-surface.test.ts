import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { buildMachineSurface } from "./machine-surface.js";

const expectedPaths = [
  "_headers",
  "llms-full.txt",
  "llms.txt",
  "openapi.json",
  "openapi.yaml",
  "robots.txt",
  "sitemap.xml",
] as const;

const openapiYaml = readFileSync(resolve(process.cwd(), "docs/openapi.yaml"), "utf8");

describe("FetchMux machine-readable domain surface", () => {
  it("publishes the complete deterministic discovery surface", () => {
    const files = buildMachineSurface({ openapiYaml });

    expect(Object.keys(files).sort()).toEqual(expectedPaths);
    for (const content of Object.values(files)) {
      expect(content.endsWith("\n")).toBe(true);
      expect(content).not.toContain("\r\n");
    }
  });

  it("explicitly allows legitimate search, user-fetch, and AI crawlers", () => {
    const robots = buildMachineSurface({ openapiYaml })["robots.txt"];

    for (const crawler of [
      "OAI-SearchBot",
      "ChatGPT-User",
      "GPTBot",
      "Claude-SearchBot",
      "Claude-User",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
    ]) {
      expect(robots).toContain(`User-agent: ${crawler}\nAllow: /`);
    }
    expect(robots).toContain("User-agent: *\nAllow: /");
    expect(robots).toContain("Sitemap: https://fetchmux.com/sitemap.xml");
    expect(robots).not.toContain("Disallow: /");
  });

  it("uses canonical HTTPS discovery URLs and truthful private-preview language", () => {
    const files = buildMachineSurface({ openapiYaml });
    const discoveryText = `${files["llms.txt"]}\n${files["llms-full.txt"]}`;
    const normalizedDiscoveryText = discoveryText.replace(/\s+/g, " ");

    expect(files["sitemap.xml"]).toContain("<loc>https://fetchmux.com/</loc>");
    expect(files["sitemap.xml"]).toContain("<loc>https://fetchmux.com/openapi.yaml</loc>");
    expect(discoveryText).toContain("https://fetchmux.com/openapi.json");
    expect(discoveryText).toContain("https://fetchmux.com/llms-full.txt");
    expect(discoveryText).toMatch(/private BYOK preview/i);
    expect(normalizedDiscoveryText).toMatch(
      /does not currently host a public API or remote MCP service/i,
    );
    expect(normalizedDiscoveryText).toMatch(/no upstream partnership or resale right is claimed/i);
  });

  it("derives equivalent YAML and JSON contracts from the canonical OpenAPI source", () => {
    const files = buildMachineSurface({ openapiYaml });

    expect(files["openapi.yaml"]).toBe(openapiYaml.replaceAll("\r\n", "\n"));
    expect(JSON.parse(files["openapi.json"])).toEqual(parseYaml(files["openapi.yaml"]));
  });

  it("never publishes private infrastructure or a nonexistent hosted service", () => {
    const surface = Object.values(buildMachineSurface({ openapiYaml })).join("\n");

    expect(surface).not.toMatch(/\.azurewebsites\.net/i);
    expect(surface).not.toContain("https://api.fetchmux.com");
    expect(surface).not.toContain("https://mcp.fetchmux.com");
    expect(surface).not.toMatch(/public hosted (?:API|service)/i);
    expect(surface).not.toMatch(/official (?:partner|partnership) of/i);
  });
});
