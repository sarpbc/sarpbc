import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    setupFiles: ["./test/vitest.setup.ts"],
    maxWorkers: 2,
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.spec.ts"] },
      },
      {
        extends: true,
        test: { name: "e2e", include: ["test/**/*.e2e-spec.ts"] },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: [
        "src/pandascore/**/*.ts",
        "src/tournament/application/sync/**/*.ts",
        "src/tournament/infrastructure/jobs/tournament.cron.ts",
        "src/auth/infrastructure/http/auth.guard.ts",
      ],
      exclude: ["**/*.spec.ts", "**/*.module.ts", "**/dto/**", "**/*.command.ts"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
