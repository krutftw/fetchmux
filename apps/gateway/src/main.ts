import { createGatewayRuntime, parseServerAddress } from "./runtime.js";

const version = process.env.npm_package_version ?? "0.1.0";
const runtime = createGatewayRuntime({
  env: process.env,
  fetch: globalThis.fetch.bind(globalThis),
  logger: false,
  version,
  warningSink: (warning) => process.stderr.write(`${warning}\n`),
  eventSink: (event) => process.stdout.write(`${JSON.stringify({ type: "route", ...event })}\n`),
});
const address = parseServerAddress(process.env);

await runtime.app.listen(address);
process.stdout.write(
  `${JSON.stringify({ type: "startup", host: address.host, port: address.port, version })}\n`,
);

let closing = false;
const shutdown = async (signal: string) => {
  if (closing) return;
  closing = true;
  process.stderr.write(`${JSON.stringify({ type: "shutdown", signal })}\n`);
  await runtime.app.close();
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
