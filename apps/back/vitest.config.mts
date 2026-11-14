import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    coverage: {
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/**/*.module.ts",
        "src/**/dto/**",
        "src/**/migrations/**",
        "src/**/*.entity.ts",
        "src/**/*.entities.ts",
        "src/**/*.schemas.ts",
        "src/main.ts",
        "src/mikro-orm.config.ts",
        "src/mikro-orm.entities.ts",
      ],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      thresholds: { lines: 70, statements: 70 },
    },
    environment: "node",
    maxWorkers: 2,
    projects: [
      {
        extends: true,
        test: {
          include: ["src/**/*.test.ts"],
          name: "unit",
          setupFiles: ["./test/vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          include: ["test/**/*.e2e.test.ts"],
          name: "e2e",
          setupFiles: ["./test/vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: { include: ["test/**/*.integration.test.mts"], name: "integration" },
      },
    ],
  },
});
