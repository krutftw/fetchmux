import { useState } from "react";

type PolicyId = "balanced" | "quality" | "latency" | "page-content";

interface RouteLane {
  readonly provider: "Brave" | "Tavily" | "Exa" | "Firecrawl";
  readonly state: "selected" | "eligible" | "closed";
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
    reasons: ["balanced_priority", "reliability_weight", "within_budget"],
    lanes: [
      { provider: "Brave", state: "selected", detail: "selected" },
      { provider: "Tavily", state: "eligible", detail: "eligible" },
      { provider: "Exa", state: "eligible", detail: "eligible" },
      { provider: "Firecrawl", state: "closed", detail: "task mismatch" },
    ],
  },
  {
    id: "quality",
    label: "Quality",
    selectedProvider: "Exa",
    estimatedCost: "$0.009",
    latency: "1.12s",
    reasons: ["quality_priority", "task_match", "within_budget"],
    lanes: [
      { provider: "Brave", state: "eligible", detail: "eligible" },
      { provider: "Tavily", state: "eligible", detail: "eligible" },
      { provider: "Exa", state: "selected", detail: "selected" },
      { provider: "Firecrawl", state: "closed", detail: "task mismatch" },
    ],
  },
  {
    id: "latency",
    label: "Fastest",
    selectedProvider: "Tavily",
    estimatedCost: "$0.004",
    latency: "410ms",
    reasons: ["latency_priority", "deadline_fit", "within_budget"],
    lanes: [
      { provider: "Brave", state: "eligible", detail: "eligible" },
      { provider: "Tavily", state: "selected", detail: "selected" },
      { provider: "Exa", state: "closed", detail: "deadline" },
      { provider: "Firecrawl", state: "closed", detail: "task mismatch" },
    ],
  },
  {
    id: "page-content",
    label: "Page",
    selectedProvider: "Firecrawl",
    estimatedCost: "$0.012",
    latency: "1.36s",
    reasons: ["task_match", "content_required", "within_budget"],
    lanes: [
      { provider: "Brave", state: "closed", detail: "task mismatch" },
      { provider: "Tavily", state: "closed", detail: "task mismatch" },
      { provider: "Exa", state: "eligible", detail: "eligible" },
      { provider: "Firecrawl", state: "selected", detail: "selected" },
    ],
  },
];

export function RouteReceiptDemo() {
  const [policy, setPolicy] = useState<PolicyId>("balanced");
  const scenario = scenarios.find(({ id }) => id === policy) ?? scenarios[0];
  if (!scenario) return null;

  return (
    <section className="route-console" aria-labelledby="route-demo-title">
      <header className="console-heading">
        <div>
          <p>fetchmux / route preview</p>
          <h2 id="route-demo-title">Decision receipt</h2>
        </div>
        <span>example · no call</span>
      </header>

      <dl className="request-spec">
        <div>
          <dt>task</dt>
          <dd>fresh_facts</dd>
        </div>
        <div>
          <dt>max spend</dt>
          <dd>$0.020</dd>
        </div>
        <div>
          <dt>deadline</dt>
          <dd>2,000ms</dd>
        </div>
      </dl>

      <fieldset className="policy-switcher">
        <legend>Routing posture</legend>
        <div>
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
        </div>
      </fieldset>

      <ol className="provider-lanes" aria-label="Provider routing candidates">
        {scenario.lanes.map((lane, index) => (
          <li className="provider-lane" data-state={lane.state} key={lane.provider}>
            <span className="lane-index">0{index + 1}</span>
            <strong>{lane.provider}</strong>
            <span className="lane-track" aria-hidden="true">
              <i />
            </span>
            <span className="lane-state">{lane.detail}</span>
          </li>
        ))}
      </ol>

      <div className="receipt-output">
        <div className="receipt-provider" aria-live="polite">
          <span>selected provider</span>
          <strong>{scenario.selectedProvider}</strong>
        </div>
        <dl>
          <div>
            <dt>est. cost</dt>
            <dd>{scenario.estimatedCost}</dd>
          </div>
          <div>
            <dt>sample latency</dt>
            <dd>{scenario.latency}</dd>
          </div>
          <div>
            <dt>fallback</dt>
            <dd>false</dd>
          </div>
        </dl>
        <ul aria-label="Route reason codes">
          {scenario.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <p className="demo-disclosure">
        Interface example only. Provider choice, timing, and cost are not live measurements.
      </p>
    </section>
  );
}
