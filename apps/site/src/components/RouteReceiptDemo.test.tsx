// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RouteReceiptDemo } from "./RouteReceiptDemo.js";

afterEach(cleanup);

describe("RouteReceiptDemo", () => {
  it("updates the illustrative selection and reason codes with policy controls", () => {
    render(<RouteReceiptDemo />);
    const demo = screen.getByRole("region", { name: "Illustrative route receipt" });

    expect(within(demo).getByText("Brave", { selector: "strong" })).toBeInTheDocument();
    expect(within(demo).getByText("BALANCED_PRIORITY")).toBeInTheDocument();
    expect(within(demo).getByText("RELIABILITY_WEIGHT")).toBeInTheDocument();

    fireEvent.click(within(demo).getByRole("button", { name: "Page content policy" }));

    expect(within(demo).getByRole("button", { name: "Page content policy" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(demo).getByText("Firecrawl", { selector: "strong" })).toBeInTheDocument();
    expect(within(demo).getByText("TASK_MATCH")).toBeInTheDocument();
    expect(within(demo).getByText("CONTENT_FETCH_REQUIRED")).toBeInTheDocument();
    expect(within(demo).getAllByText(/closed:/i)).toHaveLength(3);
  });

  it("labels the demo as illustrative rather than a live provider claim", () => {
    render(<RouteReceiptDemo />);

    expect(screen.getByText("Illustrative routing receipt")).toBeInTheDocument();
    expect(screen.getByText(/no live provider call is made by this demo/i)).toBeInTheDocument();
  });
});
