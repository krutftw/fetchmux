import { type ChildProcessByStdio, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import type { Readable } from "node:stream";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd());
const gatewayEntry = resolve(repositoryRoot, "apps/gateway/dist/main.js");
const tscEntry = resolve(repositoryRoot, "node_modules/typescript/bin/tsc");
type GatewayChild = ChildProcessByStdio<null, Readable, Readable>;

const children = new Set<GatewayChild>();

beforeAll(() => {
  const build = spawnSync(process.execPath, [tscEntry, "-b", "apps/gateway"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);
});

afterEach(async () => {
  await Promise.all([...children].map(stopGateway));
  children.clear();
});

describe("built gateway distribution", () => {
  it("starts the compiled artifact and exposes health without configured providers", async () => {
    const gateway = await startGateway({ FETCHMUX_AUTH_DISABLED: "true" });

    const health = await fetch(`${gateway.baseUrl}/health`);
    const readiness = await fetch(`${gateway.baseUrl}/ready`);
    const protectedRoute = await fetch(`${gateway.baseUrl}/v1/providers`);

    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ data: { status: "ok", version: "0.1.0" } });
    expect(readiness.status).toBe(503);
    expect(await readiness.json()).toEqual({
      data: { status: "not_ready", availableProviders: [] },
    });
    expect(protectedRoute.status).toBe(200);
    expect(gateway.stderr()).toContain(
      "FETCHMUX_AUTH_DISABLED=true: protected routes are running without authentication",
    );
  });

  it("does not disable authentication for any value except exact lowercase true", async () => {
    const gateway = await startGateway({ FETCHMUX_AUTH_DISABLED: "TRUE" });

    const response = await fetch(`${gateway.baseUrl}/v1/providers`);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "NOT_READY",
        message: "FetchMux authentication is not configured",
      },
    });
    expect(gateway.stderr()).not.toContain("running without authentication");
  });
});

interface RunningGateway {
  readonly baseUrl: string;
  readonly stderr: () => string;
}

async function startGateway(overrides: Readonly<Record<string, string>>): Promise<RunningGateway> {
  const port = await reservePort();
  const child = spawn(process.execPath, [gatewayEntry], {
    cwd: repositoryRoot,
    env: {
      ...safeProcessEnvironment(),
      NODE_ENV: "production",
      FETCHMUX_HOST: "127.0.0.1",
      FETCHMUX_PORT: String(port),
      ...overrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  children.add(child);
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  await waitUntil(
    () => stdout.includes('"type":"startup"'),
    () => `Gateway did not start. stdout=${stdout} stderr=${stderr}`,
  );
  return { baseUrl: `http://127.0.0.1:${port}`, stderr: () => stderr };
}

function safeProcessEnvironment(): NodeJS.ProcessEnv {
  const blocked = new Set([
    "FETCHMUX_API_KEY",
    "FETCHMUX_API_KEYS",
    "FETCHMUX_AUTH_DISABLED",
    "BRAVE_API_KEY",
    "TAVILY_API_KEY",
    "EXA_API_KEY",
    "FIRECRAWL_API_KEY",
    "BRAVE_COST_PER_REQUEST_USD",
    "TAVILY_COST_PER_CREDIT_USD",
    "EXA_COST_PER_REQUEST_USD",
    "FIRECRAWL_COST_PER_REQUEST_USD",
  ]);
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([name, value]) => !blocked.has(name) && value !== undefined,
    ),
  );
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a TCP port");
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return address.port;
}

async function stopGateway(child: GatewayChild): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
    new Promise<void>((resolveTimeout) => setTimeout(resolveTimeout, 2_000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

async function waitUntil(predicate: () => boolean, failureMessage: () => string): Promise<void> {
  const deadline = Date.now() + 8_000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(failureMessage());
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
}
