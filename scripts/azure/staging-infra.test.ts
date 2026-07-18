import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readInfraFile(path: string): string {
  const absolutePath = fileURLToPath(new URL(path, new URL("../../", import.meta.url)));
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

describe("Azure staging infrastructure contract", () => {
  const main = readInfraFile("infra/azure/main.bicep");
  const platform = readInfraFile("infra/azure/platform.bicep");
  const app = readInfraFile("infra/azure/app.bicep");
  const dockerIgnore = readInfraFile(".dockerignore");

  it("isolates staging in a subscription-scoped deployment", () => {
    expect(main).toContain("targetScope = 'subscription'");
    expect(main).toContain("rg-fetchmux-stg-aue");
  });

  it("uses the lowest fixed-cost private registry", () => {
    expect(platform).toContain("name: 'Basic'");
    expect(platform).toContain("adminUserEnabled: false");
    expect(platform).toContain("anonymousPullEnabled: false");
  });

  it("keeps secrets in an RBAC-protected vault", () => {
    expect(platform).toContain("enableRbacAuthorization: true");
    expect(platform).toContain("enablePurgeProtection: true");
    expect(platform).toContain("4633458b-17de-408a-b874-0445c86b69e6");
    expect(platform).toContain("b86a8fe4-44ce-4948-aee5-eccb2c155cd7");
  });

  it("pulls images without registry credentials", () => {
    expect(platform).toContain("7f951dda-4ed3-4680-a7ca-43fe172d538d");
    expect(app).toContain("identity: identity.id");
  });

  it("allows only TLS traffic from the operator CIDR", () => {
    expect(app).toContain("allowInsecure: false");
    expect(app).toContain("ipSecurityRestrictions");
    expect(app).toContain("ipAddressRange: operatorCidr");
  });

  it("scales to zero with a one-replica ceiling", () => {
    expect(app).toContain("minReplicas: 0");
    expect(app).toContain("maxReplicas: 1");
  });

  it("injects the gateway key only through a Key Vault reference", () => {
    expect(app).toContain("keyVaultUrl:");
    expect(app).toContain("secretRef: 'fetchmux-api-key'");
    expect(app).not.toContain("FETCHMUX_AUTH_DISABLED");
  });

  it("uses process health rather than provider readiness for probes", () => {
    expect(app).toContain("path: '/health'");
    expect(app).not.toContain("path: '/ready'");
  });

  it("makes the credential-free Crossref proof an explicit deployment setting", () => {
    expect(app).toContain("param crossrefEnabled bool = false");
    expect(app).toContain("param crossrefContactEmail string = ''");
    expect(app).toContain("name: 'CROSSREF_ENABLED'");
    expect(app).toContain("name: 'CROSSREF_CONTACT_EMAIL'");
    expect(app).not.toMatch(/crossref[^\n]{0,80}secretRef/i);
  });

  it("keeps local and non-runtime files out of remote image builds", () => {
    for (const path of [
      ".git",
      ".worktrees",
      "node_modules",
      "**/dist",
      ".env",
      "benchmarks",
      "docs",
      "infra",
      "scripts",
    ]) {
      expect(dockerIgnore).toContain(path);
    }
  });
});
