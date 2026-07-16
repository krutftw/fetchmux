import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Clock } from "@fetchmux/core";
import { buildProviderRegistry } from "@fetchmux/providers";
import { createBenchmarkReport } from "./report.js";
import {
  type BenchmarkExecutionMode,
  type BenchmarkProvider,
  type BenchmarkReportMode,
  hashPublicConfiguration,
  runBenchmark,
} from "./run.js";
import { benchmarkWorkloadSchema } from "./schema.js";

interface CliOptions {
  readonly workloadPath: string;
  readonly mode: BenchmarkExecutionMode;
  readonly reportMode: BenchmarkReportMode;
  readonly confirmLive: boolean;
  readonly seed?: number;
  readonly outputPath?: string;
  readonly privateQueriesPath?: string;
}

const costEnvironmentNames: Readonly<Record<string, string>> = {
  brave: "BRAVE_COST_PER_REQUEST_USD",
  tavily: "TAVILY_COST_PER_CREDIT_USD",
  exa: "EXA_COST_PER_REQUEST_USD",
  firecrawl: "FIRECRAWL_COST_PER_REQUEST_USD",
};

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const workloadPath = resolve(repositoryRoot, options.workloadPath);
  const workload = benchmarkWorkloadSchema.parse(
    JSON.parse(await readFile(workloadPath, "utf8")) as unknown,
  );
  const clock: Clock = { now: () => Date.now() };
  const registry = buildProviderRegistry({ env: process.env, fetch, clock });
  const providers = workload.providers.map((providerId) =>
    benchmarkProvider(providerId, registry, process.env),
  );

  if (options.mode === "live") validateLiveRun(options, providers);
  const privateQueryResolver =
    options.privateQueriesPath === undefined
      ? undefined
      : await loadPrivateQueryResolver(resolve(repositoryRoot, options.privateQueriesPath));
  const result = await runBenchmark({
    workload,
    providers,
    mode: options.mode,
    reportMode: options.reportMode,
    codeVersion: process.env.FETCHMUX_CODE_VERSION?.trim() || "development-uncommitted",
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    ...(privateQueryResolver === undefined ? {} : { resolvePrivateQuery: privateQueryResolver }),
  });
  const report = createBenchmarkReport(result);

  if (options.outputPath !== undefined) {
    const outputPath = resolve(repositoryRoot, options.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        mode: options.mode,
        workloadId: workload.id,
        plannedCalls: result.metadata.plannedCalls,
        executedCalls: result.metadata.executedCalls,
        outputPath,
      })}\n`,
    );
    return;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        validated: true,
        mode: options.mode,
        workloadId: workload.id,
        workloadHash: result.metadata.workloadHash,
        seed: result.metadata.seed,
        caseCount: workload.cases.length,
        providerCount: workload.providers.length,
        providers: result.metadata.providerConfigurations,
        plannedCalls: result.metadata.plannedCalls,
        executedCalls: result.metadata.executedCalls,
        networkCalls: result.metadata.executedCalls,
        banner: report.banner,
      },
      null,
      2,
    )}\n`,
  );
}

function benchmarkProvider(
  providerId: string,
  registry: ReturnType<typeof buildProviderRegistry>,
  env: Readonly<Record<string, string | undefined>>,
): BenchmarkProvider {
  const status = registry.statuses.find(({ id }) => id === providerId);
  if (!status) throw new Error(`Workload references unsupported provider ${providerId}`);
  const configured = registry.providers.find(({ profile }) => profile.id === providerId);
  const costEnvironmentName = costEnvironmentNames[providerId];
  const rawCost = costEnvironmentName === undefined ? undefined : env[costEnvironmentName];
  const parsedCost = rawCost === undefined || rawCost.trim() === "" ? null : Number(rawCost);
  const publicCost =
    parsedCost !== null && Number.isFinite(parsedCost) && parsedCost > 0 ? parsedCost : null;
  const costProfileSource = publicCost === null ? null : `environment:${costEnvironmentName}`;
  return {
    id: providerId,
    ...(configured === undefined ? {} : { configured }),
    configurationHash: hashPublicConfiguration({
      schemaVersion: 1,
      providerId,
      available: status.available,
      supportedTasks: status.supportedTasks,
      costProfileSource,
      costValueUsd: publicCost,
    }),
    costProfileSource,
  };
}

function validateLiveRun(options: CliOptions, providers: readonly BenchmarkProvider[]): void {
  if (!options.confirmLive) {
    throw new Error("Live mode requires --confirm-live because provider calls may consume credits");
  }
  if (options.outputPath === undefined) {
    throw new Error("Live mode requires --output so measured results are written deliberately");
  }
  const missing = providers
    .filter(({ configured }) => configured === undefined)
    .map(({ id }) => id);
  if (missing.length > 0) {
    throw new Error(`Live mode is missing provider credentials for: ${missing.join(", ")}`);
  }
}

async function loadPrivateQueryResolver(path: string): Promise<(reference: string) => string> {
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Private query file must be a JSON object of reference-to-query strings");
  }
  const queries = value as Record<string, unknown>;
  for (const [reference, query] of Object.entries(queries)) {
    if (typeof query !== "string" || query.trim() === "") {
      throw new Error(`Private query reference ${reference} must contain a non-empty string`);
    }
  }
  return (reference) => {
    const query = queries[reference];
    if (typeof query !== "string" || query.trim() === "") {
      throw new Error(`Private query reference ${reference} was not found`);
    }
    return query;
  };
}

function parseArguments(args: readonly string[]): CliOptions {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }
  let workloadPath: string | undefined;
  let mode: BenchmarkExecutionMode = "dry-run";
  let reportMode: BenchmarkReportMode = "private";
  let seed: number | undefined;
  let outputPath: string | undefined;
  let privateQueriesPath: string | undefined;
  let confirmLive = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--confirm-live") {
      confirmLive = true;
      continue;
    }
    const value = args[index + 1];
    if (!argument?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`Invalid benchmark argument ${argument ?? "<missing>"}\n${usage()}`);
    }
    index += 1;
    switch (argument) {
      case "--workload":
        workloadPath = value;
        break;
      case "--mode":
        if (value !== "dry-run" && value !== "live") {
          throw new Error("--mode must be dry-run or live");
        }
        mode = value;
        break;
      case "--report-mode":
        if (value !== "public" && value !== "private") {
          throw new Error("--report-mode must be public or private");
        }
        reportMode = value;
        break;
      case "--seed": {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffff_ffff) {
          throw new Error("--seed must be an integer from 0 through 4294967295");
        }
        seed = parsed;
        break;
      }
      case "--output":
        outputPath = value;
        break;
      case "--private-queries":
        privateQueriesPath = value;
        break;
      default:
        throw new Error(`Unknown benchmark argument ${argument}\n${usage()}`);
    }
  }
  if (!workloadPath) throw new Error(`--workload is required\n${usage()}`);
  return {
    workloadPath,
    mode,
    reportMode,
    confirmLive,
    ...(seed === undefined ? {} : { seed }),
    ...(outputPath === undefined ? {} : { outputPath }),
    ...(privateQueriesPath === undefined ? {} : { privateQueriesPath }),
  };
}

function usage(): string {
  return [
    "Usage: npm run benchmark -- --workload <file> [options]",
    "  --mode dry-run|live       Default: dry-run",
    "  --report-mode private|public  Default: private",
    "  --seed <uint32>           Override the workload seed",
    "  --output <file>           Write the full JSON report",
    "  --private-queries <file>  Resolve private query references from local JSON",
    "  --confirm-live            Required for calls that may consume provider credits",
  ].join("\n");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown benchmark failure";
  process.stderr.write(`Benchmark failed: ${message}\n`);
  process.exitCode = 1;
});
