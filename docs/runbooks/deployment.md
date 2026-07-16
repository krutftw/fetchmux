# Deployment runbook

## Founding deployment model

FetchMux is local or single-tenant/self-hosted first. The founding image contains no hosted control
plane, database, TLS termination, tenant isolation, or credential vault. Do not treat this package as
a reviewed multi-tenant SaaS deployment.

## Pre-deployment gate

```powershell
npm clean-install
npm test
npm run typecheck
npm run lint
npm run build
npm run benchmark -- --workload benchmarks/workloads/founding-v1.json --mode dry-run
```

Confirm separately:

- `FETCHMUX_AUTH_DISABLED` is absent or `false`;
- at least one long random FetchMux gateway key is ready;
- provider keys belong to the deploying customer or operator;
- cost profiles come from the actual provider plans;
- allowed browser origins are exact and necessary;
- the gateway will be behind a trusted TLS proxy before remote exposure.

## Run the built Node process

```powershell
$env:NODE_ENV = "production"
$env:FETCHMUX_HOST = "127.0.0.1"
$env:FETCHMUX_PORT = "8787"
$env:FETCHMUX_API_KEY = "replace-with-a-long-random-key"
$env:BRAVE_API_KEY = "replace-with-the-customer-provider-key"
node apps/gateway/dist/main.js
```

Use a process supervisor for restarts and log capture. The process writes structured startup and route
events to stdout and warnings/shutdown records to stderr. Query text and provider result bodies are
not present in route events.

## Build the container

The Dockerfile pins both an official Node 24 Bookworm slim build image and the supported Distroless
Node 24 Debian 13 `nonroot` runtime by digest, then copies only gateway, core, provider, and
production dependency artifacts into that runtime. The final image has no shell or package manager.
This follows the official
[Distroless Node pattern](https://github.com/GoogleContainerTools/distroless/tree/main/examples/nodejs)
and keeps the runtime package surface separate from build tooling.

```powershell
docker build --tag fetchmux:founding .
docker image inspect fetchmux:founding --format '{{.Config.User}}'
docker scout cves --exit-code local://fetchmux:founding
```

Expected image user: `nonroot`. Treat any Docker Scout finding as a deployment gate: verify the
current upstream digests, update the pinned build image or supported Distroless runtime, and rebuild
before release. Distroless images are updated from Debian security releases, but the scan result is
still time-specific and must be rerun for every release.

Because the runtime is shell-free, use container logs and health endpoints for diagnosis. If an
interactive shell is essential during local incident analysis, rebuild a temporary image from the
matching Distroless `debug-nonroot` tag; never publish or promote that debug image.

## Start with Compose

```powershell
Copy-Item .env.example .env
# Edit .env locally and replace every placeholder. Never commit it.
docker compose config
docker compose up --build -d
docker compose ps
```

Compose binds only `127.0.0.1:8787`, uses a read-only root filesystem, drops all Linux capabilities,
sets `no-new-privileges`, and provides a small `/tmp` tmpfs. It mounts no source tree and bakes no
credentials into image layers.

## Verify after start

```powershell
$health = Invoke-WebRequest http://127.0.0.1:8787/health -SkipHttpErrorCheck
$ready = Invoke-WebRequest http://127.0.0.1:8787/ready -SkipHttpErrorCheck
$health.StatusCode
$ready.StatusCode
docker compose ps
docker compose logs --tail 100 gateway
```

Expected:

- health is `200`;
- readiness is `200` with a provider key and `503` without one;
- the container becomes healthy;
- no credential or query appears in logs.

Then call `/v1/providers` with the FetchMux bearer key and confirm only safe configuration status is
returned.

## TLS and network exposure

The container serves plain HTTP. Keep its published port on loopback and place a reviewed reverse
proxy or private service network in front of it. The proxy must:

- terminate TLS with a valid certificate;
- preserve or generate request correlation headers without logging authorization values;
- enforce a request-body ceiling no higher than the gateway's 64 KiB limit;
- apply network-level rate limiting appropriate to the workload;
- restrict access to intended clients;
- never cache `/v1/search` responses unless customer data rules explicitly allow it.

Do not bind Compose to `0.0.0.0` merely to make remote testing convenient.

## Gateway-key rotation

1. Generate a new long random gateway key outside the repository.
2. Set `FETCHMUX_API_KEYS` to `old-key,new-key` in the process secret configuration.
3. Restart or redeploy and verify both keys on `/v1/providers`.
4. Move every client to the new key.
5. Remove the old key from `FETCHMUX_API_KEYS`.
6. Redeploy and verify the old key receives `401`.
7. Record the rotation date without recording either key.

The parser deduplicates comma-separated rotation keys. Whitespace is ignored.

## Provider-key rotation

Follow the provider's account procedure. Where overlapping keys are supported, add the new key,
restart FetchMux, verify one controlled request, then revoke the old key. FetchMux accepts one key per
provider in the founding configuration; overlap must therefore be managed by the provider or the
process secret manager.

## Graceful shutdown

```powershell
docker compose stop --timeout 10 gateway
docker compose down
```

Docker sends `SIGTERM`; FetchMux stops accepting work and closes Fastify. A forced kill can interrupt
an in-flight provider request, so investigate repeated shutdown timeouts.

## Rollback

Build immutable commit tags in addition to the friendly tag:

```powershell
$sha = git rev-parse --short=12 HEAD
docker build --tag "fetchmux:$sha" .
```

To roll back, run the last verified commit-tagged image with the same secret injection and network
policy. Do not roll back `.env` blindly: preserve any emergency key rotation and compare variable
names without printing values.

## Backup scope

The founding gateway has no database. Back up, in a secret-appropriate system:

- deployment configuration and provider cost-profile provenance;
- gateway and provider credentials through the secret manager, not repository backups;
- customer-authored workloads and policy choices;
- benchmark reports intentionally retained outside git;
- reverse-proxy and process-supervisor configuration.

Route events are stdout only. If the operator needs history, configure an encrypted log or metric
destination with explicit retention; FetchMux does not provide that storage in this build.
