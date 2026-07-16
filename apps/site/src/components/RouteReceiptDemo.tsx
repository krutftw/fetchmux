import { useState } from "react";

type PolicyId = "balanced" | "quality" | "latency" | "page-content";

interface RouteLane {
  readonly provider: "Brave" | "Tavily" | "Exa" | "Firecrawl";
  readonly state: "selected" | "closed";
  readonly detail: string;
}

interface PolicyScenario {
  readonly id: PolicyId;
  readonly label: string;
  readonly selectedProvider: RouteLane["provider"];
  readonly estimatedCost: string;
  readonly latency: string;
  readonly reasons: readonly string[];
  readonly lanes: readonly RouteLane[];
}

const scenarios: readonly PolicyScenario[] = [
  {
    id: "balanced",
    label: "Balanced",
    selectedProvider: "Brave",
    estimatedCost: "$0.005",
    latency: "640ms",
    reasons: ["BALANCED_PRIORITY", "RELIABILITY_WEIGHT", "WITHIN_BUDGET"],
    lanes: [
      { provider: "Brave", state: "selected", detail: "Selected: balanced policy fit" },
      { provider: "Tavily", state: "closed", detail: "Closed: lower policy score" },
      { provider: "Exa", state: "closed", detail: "Closed: quality premium not requested" },
      { provider: "Firecrawl", state: "closed", detail: "Closed: content fetch not requested" },
    ],
  },
  {
    id: "quality",
    label: "Quality",
    selectedProvider: "Exa",
    estimatedCost: "$0.009",
    latency: "1.12s",
    reasons: ["QUALITY_PRIORITY", "TASK_MATCH", "WITHIN_BUDGET"],
    lanes: [
      { provider: "Brave", state: "closed", detail: "Closed: lower quality score" },
      { provider: "Tavily", state: "closed", detail: "Closed: tie broken by task fit" },
      { provider: "Exa", state: "selected", detail: "Selected: quality policy fit" },
      { provider: "Firecrawl", state: "closed", detail: "Closed: content fetch not requested" },
    ],
  },
  {
    id: "latency",
    label: "Fastest",
    selectedProvider: "Tavily",
    estimatedCost: "$0.004",
    latency: "410ms",
    reasons: ["LATENCY_PRIORITY", "DEADLINE_FIT", "WITHIN_BUDGET"],
    lanes: [
      { provider: "Brave", state: "closed", detail: "Closed: slower illustrative estimate" },
      { provider: "Tavily", state: "selected", detail: "Selected: latency policy fit" },
      { provider: "Exa", state: "closed", detail: "Closed: outside latency preference" },
      { provider: "Firecrawl", state: "closed", detail: "Closed: content fetch not requested" },
    ],
  },
  {
    id: "page-content",
    label: "Page content",
    selectedProvider: "Firecrawl",
    estimatedCost: "$0.012",
    latency: "1.36s",
    reasons: ["TASK_MATCH", "CONTENT_FETCH_REQUIRED", "WITHIN_BUDGET"],
    lanes: [
      { provider: "Brave", state: "closed", detail: "Closed: content fetch required" },
      { provider: "Tavily", state: "closed", detail: "Closed: content fetch required" },
      { provider: "Exa", state: "closed", detail: "Closed: lower task score" },
      { provider: "Firecrawl", state: "selected", detail: "Selected: page-content policy fit" },
    ],
  },
];

export function RouteReceiptDemo() {
  const [policy, setPolicy] = useState<PolicyId>("balanced");
  const scenario = scenarios.find(({ id }) => id === policy) ?? scenarios[0];
  if (!scenario) return null;

  return (
    <section className="route-console reveal reveal-delay-2" aria-labelledby="route-demo-title">
      <div className="console-heading">
        <div>
          <p className="console-kicker">Illustrative routing receipt</p>
          <h2 id="route-demo-title">Illustrative route receipt</h2>
        </div>
        <span className="console-live">SIMULATION / NO CALL</span>
      </div>

      <div className="request-line">
        <span>task: fresh_facts</span>
        <span>budget: $0.020</span>
        <span>deadline: 2,000ms</span>
      </div>

      <fieldset className="policy-switcher">
        <legend className="sr-only">Illustrative routing policy</legend>
        {scenarios.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            aria-label={`${candidate.label} policy`}
            aria-pressed={candidate.id === policy}
            onClick={() => setPolicy(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
      </fieldset>

      <ol className="provider-lanes" aria-label="Provider lanes">
        {scenario.lanes.map((lane, index) => (
          <li
            className="provider-lane"
            data-state={lane.state}
            style={{ "--lane-index": index } as React.CSSProperties}
            key={lane.provider}
          >
            <span className="lane-index">0{index + 1}</span>
            <span className="lane-provider">{lane.provider}</span>
            <span className="lane-track" aria-hidden="true" />
            <span className="lane-state">{lane.detail}</span>
          </li>
        ))}
      </ol>

      <div className="receipt-output">
        <p className="selected-provider" aria-live="polite">
          Selected provider <strong>{scenario.selectedProvider}</strong>
        </p>
        <dl>
          <div>
            <dt>Illustrative cost</dt>
            <dd>{scenario.estimatedCost}</dd>
          </div>
          <div>
            <dt>Illustrative latency</dt>
            <dd>{scenario.latency}</dd>
          </div>
          <div>
            <dt>Fallback</dt>
            <dd>false</dd>
          </div>
        </dl>
        <ul className="reason-codes" aria-label="Route reason codes">
          {scenario.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <p className="demo-disclosure">
        No live provider call is made by this demo. Names, timing, and cost values illustrate the
        receipt interface only.
      </p>
    </section>
  );
}
