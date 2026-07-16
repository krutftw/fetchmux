import { randomUUID } from "node:crypto";
import {
  type Clock,
  type FetchLike,
  type IdFactory,
  InMemoryProviderHealthStore,
  RetrievalRouter,
  type RouterScheduler,
} from "@fetchmux/core";
import { buildProviderRegistry, type ProviderRegistry } from "@fetchmux/providers";
import type { FastifyInstance } from "fastify";
import { buildApp, type GatewayEvent } from "./app.js";

export interface CreateGatewayRuntimeOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly fetch: FetchLike;
  readonly logger: boolean;
  readonly version: string;
  readonly warningSink: (warning: string) => void;
  readonly eventSink: (event: GatewayEvent) => void;
}

export interface GatewayRuntime {
  readonly app: FastifyInstance;
  readonly router: RetrievalRouter;
  readonly registry: ProviderRegistry;
  readonly apiKeys: readonly string[];
  readonly authDisabled: boolean;
}

export interface ServerAddress {
  readonly host: string;
  readonly port: number;
}

const systemClock: Clock = { now: () => Date.now() };
const systemIdFactory: IdFactory = {
  createTraceId: () => `rt_${randomUUID()}`,
};
const systemScheduler: RouterScheduler = {
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createGatewayRuntime(options: CreateGatewayRuntimeOptions): GatewayRuntime {
  const registry = buildProviderRegistry({
    env: options.env,
    fetch: options.fetch,
    clock: systemClock,
  });
  const healthStore = new InMemoryProviderHealthStore({ clock: systemClock });
  const router = new RetrievalRouter({
    providers: registry.providers,
    healthStore,
    clock: systemClock,
    idFactory: systemIdFactory,
    scheduler: systemScheduler,
  });
  const apiKeys = parseApiKeys(options.env);
  const authDisabled = options.env.FETCHMUX_AUTH_DISABLED === "true";
  const allowedOrigins = parseList(options.env.FETCHMUX_ALLOWED_ORIGINS);
  const app = buildApp({
    router,
    providerStatuses: registry.statuses,
    apiKeys,
    authDisabled,
    warningSink: options.warningSink,
    eventSink: options.eventSink,
    allowedOrigins,
    logger: options.logger,
    version: options.version,
  });
  return { app, router, registry, apiKeys, authDisabled };
}

export function parseServerAddress(
  env: Readonly<Record<string, string | undefined>>,
): ServerAddress {
  const host = env.FETCHMUX_HOST?.trim() || "127.0.0.1";
  const rawPort = env.FETCHMUX_PORT?.trim() || "8787";
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError("FETCHMUX_PORT must be an integer from 1 to 65535");
  }
  return { host, port };
}

function parseApiKeys(env: Readonly<Record<string, string | undefined>>): readonly string[] {
  return [...new Set([...parseList(env.FETCHMUX_API_KEY), ...parseList(env.FETCHMUX_API_KEYS)])];
}

function parseList(value: string | undefined): readonly string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
