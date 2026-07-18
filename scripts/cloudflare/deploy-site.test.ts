import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readRelative(relativePath: string): string {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("Cloudflare site deployment contract", () => {
  const deploy = readRelative("deploy-site.ps1");
  const runbook = readRelative("../../docs/runbooks/cloudflare-domain.md");

  it("requires explicit apply authority and supports mutation-free validation", () => {
    expect(deploy).toContain("[switch]$Apply");
    expect(deploy).toContain("[switch]$ValidateOnly");
    expect(deploy).toContain("if ($ValidateOnly)");
    expect(deploy).toContain("if (-not $Apply)");
    expect(deploy.indexOf("if ($ValidateOnly)")).toBeLessThan(
      deploy.indexOf("'pages', 'project', 'create'"),
    );
  });

  it("builds and deploys only an exact clean Git commit", () => {
    expect(deploy).toContain("status --porcelain");
    expect(deploy).toContain("rev-parse HEAD");
    expect(deploy).toMatch(/run[\s\S]{0,80}build[\s\S]{0,80}@fetchmux\/site/);
    expect(deploy).toContain("'pages', 'deploy'");
    expect(deploy).toContain("'--commit-hash', $gitSha");
    expect(deploy).toContain("'--commit-dirty=false'");
  });

  it("targets the one canonical Pages project and domain", () => {
    expect(deploy).toContain("$ProjectName = 'fetchmux'");
    expect(deploy).toContain("$CanonicalDomain = 'fetchmux.com'");
    expect(deploy).toContain("$ProductionBranch = 'main'");
    expect(deploy).toContain("'pages', 'project', 'create'");
    expect(deploy).toContain("/pages/projects/$ProjectName/domains");
  });

  it("verifies the deployment surface before attaching the apex domain", () => {
    for (const path of [
      "/robots.txt",
      "/llms.txt",
      "/llms-full.txt",
      "/openapi.yaml",
      "/openapi.json",
      "/sitemap.xml",
    ]) {
      expect(deploy).toContain(`'${path}'`);
    }
    expect(deploy).toContain("Content-Type");
    expect(deploy).toContain("Content-Security-Policy");
    expect(deploy).toContain("Strict-Transport-Security");
    expect(deploy).toContain("deployment_trigger.metadata");
    expect(deploy).toContain("[int]$MaxAttempts = 40");
    expect(deploy).toContain("Test-SiteSurface -Origin $deploymentOrigin");
    expect(deploy.indexOf("Test-SiteSurface -Origin $deploymentOrigin")).toBeLessThan(
      deploy.indexOf("Add-CustomDomain -Credential"),
    );
  });

  it("never accepts, prints, or forwards a token on a command line", () => {
    expect(deploy).not.toMatch(
      /param\([\s\S]{0,500}\$(?:Api|Cloudflare|Access|Secret|OAuth)?Token/i,
    );
    expect(deploy).not.toMatch(/Write-(?:Host|Output)[^\n]*(?:token|secret|credential)/i);
    expect(deploy).not.toMatch(/--(?:api-)?token/i);
    expect(deploy).not.toMatch(/cfat_[A-Za-z0-9_-]+/);
  });

  it("documents read-back, rollback, and email routing without a browser workflow", () => {
    expect(runbook).toContain("-ValidateOnly");
    expect(runbook).toContain("-Apply");
    expect(runbook).toMatch(/rollback/i);
    expect(runbook).toMatch(/email routing/i);
    expect(`${deploy}\n${runbook}`).not.toMatch(/Start-Process|chrome|msedge|firefox/i);
  });
});
