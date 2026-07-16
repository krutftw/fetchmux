import cors from "@fastify/cors";
import {
  FetchMuxError,
  type RetrievalRouter,
  type RouteReasonCode,
  searchRequestSchema,
} from "@fetchmux/core";
import type { ProviderStatus } from "@fetchmux/providers";
import Fastify, { type FastifyInstance, type FastifyRequest, LogController } from "fastify";
import { ZodError } from "zod";
import { authenticateBearer } from "./auth.js";

export interface GatewayEvent {
  readonly requestId: string;
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly selectedProvider?: string;
  readonly estimatedCostUsd?: number | null;
  readonly reasonCodes?: readonly RouteReasonCode[];
  readonly fallbackUsed?: boolean;
}

interface RouteOutcome {
  readonly selectedProvider: string;
  readonly estimatedCostUsd: number | null;
  readonly reasonCodes: readonly RouteReasonCode[];
  readonly fallbackUsed: boolean;
}

export interface BuildAppOptions {
  readonly router: Pick<RetrievalRouter, "preview" | "search">;
  readonly providerStatuses: readonly ProviderStatus[];
  readonly apiKeys: readonly string[];
  readonly authDisabled: boolean;
  readonly warningSink: (warning: string) => void;
  readonly eventSink?: (event: GatewayEvent) => void;
  readonly allowedOrigins?: readonly string[];
  readonly logger: boolean;
  readonly version: string;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger,
    logController: new LogController({ disableRequestLogging: true }),
    bodyLimit: 64 * 1_024,
  });
  const routeOutcomes = new WeakMap<FastifyRequest, RouteOutcome>();

  if (options.allowedOrigins && options.allowedOrigins.length > 0) {
    const allowedOrigins = new Set(options.allowedOrigins);
    void app.register(cors, {
      origin: (origin, callback) => {
        callback(null, origin === undefined || allowedOrigins.has(origin));
      },
      methods: ["GET", "POST", "OPTIONS"],
    });
  }

  if (options.authDisabled) {
    options.warningSink(
      "FETCHMUX_AUTH_DISABLED=true: protected routes are running without authentication",
    );
  }

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/v1/")) return;
    const result = authenticateBearer(
      request.headers.authorization,
      options.apiKeys,
      options.authDisabled,
    );
    if (result === "allowed") return;
    if (result === "missing_configuration") {
      return reply.code(503).send({
        error: {
          code: "NOT_READY",
          message: "FetchMux authentication is not configured",
        },
      });
    }
    return reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "A valid FetchMux API key is required",
      },
    });
  });

  app.addHook("onResponse", async (request, reply) => {
    if (!options.eventSink) return;
    const outcome = routeOutcomes.get(request);
    options.eventSink({
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url ?? request.url.split("?", 1)[0] ?? "unknown",
      statusCode: reply.statusCode,
      latencyMs: reply.elapsedTime,
      ...(outcome === undefined ? {} : outcome),
    });
  });

  app.get("/health", async () => ({
    data: { status: "ok", version: options.version },
  }));

  app.get("/ready", async (_request, reply) => {
    const availableProviders = options.providerStatuses.filter((status) => status.available);
    const ready = availableProviders.length > 0;
    return reply.code(ready ? 200 : 503).send({
      data: {
        status: ready ? "ready" : "not_ready",
        availableProviders: availableProviders.map((provider) => provider.id),
      },
    });
  });

  app.get("/v1/providers", async () => ({
    data: { providers: options.providerStatuses },
  }));

  app.post("/v1/route/preview", async (request) => {
    const input = searchRequestSchema.parse(request.body);
    return { data: options.router.preview(input) };
  });

  app.post("/v1/search", async (request) => {
    const input = searchRequestSchema.parse(request.body);
    const data = await options.router.search(input);
    routeOutcomes.set(request, {
      selectedProvider: data.route.selectedProvider,
      estimatedCostUsd: data.route.estimatedCostUsd,
      reasonCodes: data.route.reasonCodes,
      fallbackUsed: data.route.fallbackUsed,
    });
    return { data };
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid retrieval request",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }
    if (error instanceof FetchMuxError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.traceId === undefined ? {} : { traceId: error.traceId }),
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "FST_ERR_CTP_BODY_TOO_LARGE"
    ) {
      return reply.code(413).send({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "The request body is too large",
        },
      });
    }
    return reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed",
      },
    });
  });

  return app;
}
