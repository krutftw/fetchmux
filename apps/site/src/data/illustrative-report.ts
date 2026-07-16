export interface IllustrativeMetricRow {
  readonly label: string;
  readonly latency: string;
  readonly success: string;
  readonly cost: string;
  readonly illustrative: true;
  readonly comparisonAllowed: false;
}

export const illustrativeReport = {
  illustrative: true,
  comparisonAllowed: false,
  banner: "Illustrative — not live provider results",
  rows: [
    {
      label: "Route A",
      latency: "0.82s",
      success: "92%",
      cost: "$0.006",
      illustrative: true,
      comparisonAllowed: false,
    },
    {
      label: "Route B",
      latency: "1.14s",
      success: "83%",
      cost: "$0.004",
      illustrative: true,
      comparisonAllowed: false,
    },
    {
      label: "Route C",
      latency: "1.48s",
      success: "88%",
      cost: "$0.009",
      illustrative: true,
      comparisonAllowed: false,
    },
  ] satisfies readonly IllustrativeMetricRow[],
} as const;
