import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMachineSurface, machineSurfacePaths } from "./machine-surface.js";

export interface WriteMachineSurfaceOptions {
  openapiYaml: string;
  targetDirectory: string;
}

export function writeMachineSurface({
  openapiYaml,
  targetDirectory,
}: WriteMachineSurfaceOptions): void {
  const output = buildMachineSurface({ openapiYaml });
  mkdirSync(targetDirectory, { recursive: true });

  for (const path of machineSurfacePaths) {
    const outputPath = resolve(targetDirectory, path);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, output[path], "utf8");
  }
}

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const openapiPath = resolve(repositoryRoot, "docs/openapi.yaml");
  const targetDirectory = resolve(repositoryRoot, "apps/site/public");

  writeMachineSurface({
    openapiYaml: readFileSync(openapiPath, "utf8"),
    targetDirectory,
  });
}
