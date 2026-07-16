# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.18.0

FROM node:${NODE_VERSION}-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS build

ENV CI=true
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json tsconfig.solution.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --ignore-scripts
RUN npm run build -w @fetchmux/gateway
RUN rm -rf node_modules && \
    npm ci --omit=dev --ignore-scripts \
      --workspace @fetchmux/gateway \
      --workspace @fetchmux/core \
      --workspace @fetchmux/providers \
      --include-workspace-root=false

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:af85d11ce7ef10172855a6e3649e3e8125b1b9e3ca41849ec2918036f05cb212 AS runtime

ENV NODE_ENV=production \
    FETCHMUX_HOST=0.0.0.0 \
    FETCHMUX_PORT=8787

WORKDIR /app

COPY --from=build --chown=65532:65532 /app/package.json /app/package-lock.json ./
COPY --from=build --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=build --chown=65532:65532 /app/packages/core/package.json ./packages/core/package.json
COPY --from=build --chown=65532:65532 /app/packages/core/dist ./packages/core/dist
COPY --from=build --chown=65532:65532 /app/packages/providers/package.json ./packages/providers/package.json
COPY --from=build --chown=65532:65532 /app/packages/providers/dist ./packages/providers/dist
COPY --from=build --chown=65532:65532 /app/apps/gateway/package.json ./apps/gateway/package.json
COPY --from=build --chown=65532:65532 /app/apps/gateway/dist ./apps/gateway/dist

USER nonroot

EXPOSE 8787
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["apps/gateway/dist/main.js"]
