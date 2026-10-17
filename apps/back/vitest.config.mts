import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    maxWorkers: 2,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.spec.ts"],
          setupFiles: ["./test/vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["test/**/*.e2e-spec.ts"],
          setupFiles: ["./test/vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: { name: "integration", include: ["test/**/*.integration-spec.mjs"] },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/*.d.ts",
        "src/**/*.module.ts",
        "src/**/dto/**",
        "src/**/migrations/**",
        "src/**/*.entity.ts",
        "src/**/*.entities.ts",
        "src/main.ts",
        "src/mikro-orm.config.ts",
        "src/mikro-orm.entities.ts",
      ],
      reporter: ["text", "html", "lcov", "json-summary"],
      thresholds: { lines: 70, statements: 70 },
    },
  },
});
