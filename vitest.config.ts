import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@fetchmux/core": fromRoot("./packages/core/src/index.ts"),
      "@fetchmux/providers": fromRoot("./packages/providers/src/index.ts"),
      "@fetchmux/sdk": fromRoot("./packages/sdk/src/index.ts"),
    },
  },
  test: {
    coverage: {
      reporter: ["text", "json-summary"],
    },
    passWithNoTests: true,
    restoreMocks: true,
  },
});
