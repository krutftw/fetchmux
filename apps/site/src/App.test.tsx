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
  it("states the exact product promise and honest commercial posture", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "One retrieval API. The right provider for every request.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/bring your own provider keys/i)).toBeInTheDocument();
    expect(screen.getByText(/no partnership or resale right is claimed/i)).toBeInTheDocument();
    expect(screen.getByText("Illustrative — not live provider results")).toBeInTheDocument();

    const pricing = screen.getByRole("region", { name: "Pricing hypotheses" });
    expect(within(pricing).getByText("$750 setup + $99 first month")).toBeInTheDocument();
    expect(within(pricing).getByText("$49 / month")).toBeInTheDocument();
    expect(within(pricing).getByText("$199 / month")).toBeInTheDocument();
    expect(within(pricing).getAllByText(/price hypothesis/i)).toHaveLength(2);
  });

  it("shows an unavailable pilot state instead of inventing an intake destination", () => {
    render(<App />);

    const pilot = screen.getByRole("region", { name: "Founding pilot intake" });
    expect(within(pilot).getByText("Pilot intake is not configured yet.")).toBeInTheDocument();
    expect(
      within(pilot).queryByRole("link", { name: "Apply for a founding pilot" }),
    ).not.toBeInTheDocument();
  });

  it("uses only a configured safe contact URL", () => {
    const { rerender } = render(<App pilotContactUrl="javascript:alert('unsafe')" />);
    expect(
      screen.queryByRole("link", { name: "Apply for a founding pilot" }),
    ).not.toBeInTheDocument();

    rerender(<App pilotContactUrl="https://example.com/fetchmux-pilot" />);

    expect(screen.getByRole("link", { name: "Apply for a founding pilot" })).toHaveAttribute(
      "href",
      "https://example.com/fetchmux-pilot",
    );
  });

  it("provides semantic landmarks, keyboard entry, and reduced-motion support", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    const styles = readFileSync(resolve(process.cwd(), "apps/site/src/styles.css"), "utf8");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(":focus-visible");
    expect(styles).toMatch(/\.code-heading button\s*\{[^}]*min-height: 44px;/s);
  });

  it("declares an explicit local favicon so browsers do not request a missing default", () => {
    const html = readFileSync(resolve(process.cwd(), "apps/site/index.html"), "utf8");

    expect(html).toContain('<link rel="icon" href="/favicon.svg" />');
  });

  it("copies install examples with named controls", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy REST example" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "REST example copied" })).toBeInTheDocument();
  });
});
