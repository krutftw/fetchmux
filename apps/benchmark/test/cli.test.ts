import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

describe("benchmark CLI", () => {
  it("resolves documented workload paths from the repository root", () => {
    const result = spawnSync(
      process.execPath,
      [
        resolve(repositoryRoot, "node_modules/tsx/dist/cli.mjs"),
        resolve(repositoryRoot, "apps/benchmark/src/main.ts"),
        "--workload",
        "benchmarks/workloads/founding-v1.json",
        "--mode",
        "dry-run",
      ],
      { cwd: resolve(repositoryRoot, "apps/benchmark"), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('"plannedCalls": 96');
    expect(result.stdout).toContain('"networkCalls": 0');
  });
});
