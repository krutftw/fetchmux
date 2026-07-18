// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RouteReceiptDemo } from "./RouteReceiptDemo.js";

afterEach(cleanup);

describe("RouteReceiptDemo", () => {
  it("updates the example selection and reason codes with policy controls", () => {
    render(<RouteReceiptDemo />);
    const demo = screen.getByRole("region", { name: "Decision receipt" });

    expect(
      within(demo).getByText("Brave", { selector: ".receipt-provider strong" }),
    ).toBeInTheDocument();
    expect(within(demo).getByText("balanced_priority")).toBeInTheDocument();
    expect(within(demo).getByText("reliability_weight")).toBeInTheDocument();

    fireEvent.click(within(demo).getByRole("button", { name: "Page policy" }));

    expect(within(demo).getByRole("button", { name: "Page policy" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(demo).getByText("Firecrawl", { selector: ".receipt-provider strong" }),
    ).toBeInTheDocument();
    expect(within(demo).getByText("task_match")).toBeInTheDocument();
    expect(within(demo).getByText("content_required")).toBeInTheDocument();
    expect(within(demo).getAllByText("task mismatch")).toHaveLength(2);
  });

  it("labels the product surface as an example rather than a live provider claim", () => {
    render(<RouteReceiptDemo />);

    expect(screen.getByText("Decision receipt")).toBeInTheDocument();
    expect(screen.getByText("example · no call")).toBeInTheDocument();
    expect(
      screen.getByText(/provider choice, timing, and cost are not live measurements/i),
    ).toBeInTheDocument();
  });
});
