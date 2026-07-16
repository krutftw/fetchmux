import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readScript(name: string): string {
  const path = fileURLToPath(new URL(name, import.meta.url));
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("Azure staging operations contract", () => {
  const deploy = readScript("deploy-staging.ps1");
  const verify = readScript("verify-staging.ps1");
  const combined = `${deploy}\n${verify}`;

  it("requires explicit apply authority for Azure mutations", () => {
    expect(deploy).toContain("[switch]$Apply");
    expect(deploy).toContain("[switch]$ValidateOnly");
    expect(deploy).toContain("if (-not $Apply)");
    expect(deploy).toContain("deployment sub what-if");
    expect(deploy).toContain("deployment group what-if");
  });

  it("deploys only a clean exact Git commit", () => {
    expect(deploy).toContain("status --porcelain");
    expect(deploy).toContain("rev-parse HEAD");
    expect(deploy).toContain("fetchmux-gateway:$gitSha");
    expect(deploy).not.toMatch(/fetchmux-gateway:(latest|staging)/i);
  });

  it("registers only the approved resource providers", () => {
    for (const provider of [
      "Microsoft.App",
      "Microsoft.ContainerRegistry",
      "Microsoft.KeyVault",
      "Microsoft.ManagedIdentity",
      "Microsoft.OperationalInsights",
    ]) {
      expect(deploy).toContain(`'${provider}'`);
    }
  });

  it("keeps generated gateway credentials out of files and command arguments", () => {
    expect(deploy).toContain("RandomNumberGenerator");
    expect(deploy).toContain("https://vault.azure.net");
    expect(deploy).toContain("Invoke-RestMethod");
    expect(deploy).not.toMatch(/keyvault secret set[^\n]*--value/i);
    expect(combined).toContain("Remove-Variable gatewayKey");
    expect(combined).not.toMatch(/Write-(Host|Output)[^\n]*gatewayKey/i);
  });

  it("verifies Azure state and all four expected HTTP outcomes", () => {
    expect(verify).toContain("adminUserEnabled");
    expect(verify).toContain("ipSecurityRestrictions");
    expect(verify).toContain("minReplicas");
    expect(verify).toContain("maxReplicas");
    expect(verify).toContain("healthStatus");
    expect(verify).toContain("readyStatus");
    expect(verify).toContain("unauthorizedStatus");
    expect(verify).toContain("authorizedStatus");
  });

  it("never invokes a browser", () => {
    expect(combined).not.toMatch(/Start-Process|chrome|msedge|firefox|browser/i);
  });
});
