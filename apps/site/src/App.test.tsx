// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("FetchMux launch site", () => {
  it("leads with a concrete product problem and one honest commercial offer", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /stop wiring search providers into your agent/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bring your own keys")).toBeInTheDocument();
    expect(screen.getByText(/interface example only/i)).toBeInTheDocument();
    expect(screen.getByText(/no partnership or resale right is claimed/i)).toBeInTheDocument();

    const pilot = screen.getByRole("region", { name: "Founding pilot intake" });
    expect(within(pilot).getByText("$750")).toBeInTheDocument();
    expect(within(pilot).getByText("setup + $99 first month")).toBeInTheDocument();
    expect(screen.queryByText(/pricing hypotheses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/illustrative benchmark/i)).not.toBeInTheDocument();
  });

  it("shows an unavailable pilot state instead of inventing an intake destination", () => {
    render(<App />);

    const pilot = screen.getByRole("region", { name: "Founding pilot intake" });
    expect(within(pilot).getByText("Pilot intake is being connected.")).toBeInTheDocument();
    expect(
      within(pilot).queryByRole("link", { name: "Book a founding pilot" }),
    ).not.toBeInTheDocument();
  });

  it("uses only a configured safe contact URL", () => {
    const { rerender } = render(<App pilotContactUrl="javascript:alert('unsafe')" />);
    expect(screen.queryByRole("link", { name: "Book a founding pilot" })).not.toBeInTheDocument();

    rerender(<App pilotContactUrl="https://example.com/fetchmux-pilot" />);

    expect(screen.getByRole("link", { name: "Book a founding pilot" })).toHaveAttribute(
      "href",
      "https://example.com/fetchmux-pilot",
    );
  });

  it("provides semantic landmarks, keyboard entry, mobile navigation, and reduced motion", () => {
    const { container } = render(<App />);

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Open navigation" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Close navigation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    const styles = readFileSync(resolve(process.cwd(), "apps/site/src/styles.css"), "utf8");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(":focus-visible");
    expect(styles).toMatch(/\.code-heading button\s*\{[^}]*min-height: 44px;/s);
    expect(styles).not.toContain("ease-in-out");
    expect(styles).not.toContain("Archivo Variable");
    expect(container.querySelectorAll("[data-reveal]")).toHaveLength(0);
    expect(styles).not.toContain("[data-reveal]");
  });

  it("declares an explicit local favicon so browsers do not request a missing default", () => {
    const html = readFileSync(resolve(process.cwd(), "apps/site/index.html"), "utf8");

    expect(html).toContain('<link rel="icon" href="/favicon.svg" />');
  });

  it("emits fonts as same-origin assets instead of CSP-blocked data URLs", () => {
    const viteConfig = readFileSync(resolve(process.cwd(), "apps/site/vite.config.ts"), "utf8");
    const headers = readFileSync(resolve(process.cwd(), "apps/site/public/_headers"), "utf8");

    expect(viteConfig).toMatch(/assetsInlineLimit:\s*0/);
    expect(headers).toContain("font-src 'self'");
    expect(headers).not.toContain("font-src 'self' data:");
  });

  it("states domain and provider status without putting legal copy in the hero", () => {
    render(<App />);

    expect(
      screen.getByText(/fetchmux\.com secured\. trademark review pending/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "OpenAPI contract" })).toHaveAttribute(
      "href",
      "/openapi.yaml",
    );
    expect(screen.getByRole("link", { name: "Agent brief" })).toHaveAttribute("href", "/llms.txt");
  });

  it("publishes canonical, social, and structured software identity metadata", () => {
    const html = readFileSync(resolve(process.cwd(), "apps/site/index.html"), "utf8");

    expect(html).toContain('<link rel="canonical" href="https://fetchmux.com/" />');
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:url" content="https://fetchmux.com/" />');
    expect(html).toContain('<meta property="og:site_name" content="FetchMux" />');
    expect(html).toContain('<meta name="twitter:card" content="summary" />');
    expect(html).toContain(
      '<meta name="twitter:title" content="FetchMux — retrieval routing for AI agents" />',
    );

    const structuredDataMatch = html.match(
      /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
    );
    expect(structuredDataMatch).not.toBeNull();
    if (!structuredDataMatch) throw new Error("Missing JSON-LD software identity");

    const structuredData = JSON.parse(structuredDataMatch[1] ?? "") as Record<string, unknown>;
    expect(structuredData).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      applicationCategory: "DeveloperApplication",
      name: "FetchMux",
      url: "https://fetchmux.com/",
    });
  });

  it("copies install examples with named controls", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy REST / search" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "REST / search copied" })).toBeInTheDocument();
  });
});
