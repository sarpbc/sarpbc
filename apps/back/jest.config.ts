import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/../tsconfig.spec.json",
      },
    ],
  },
  // Coverage only on code we actually unit-test today — not the whole Nest app (~200 files).
  collectCoverageFrom: [
    "pandascore/**/*.(t|j)s",
    "tournament/sync/**/*.(t|j)s",
    "tournament/tournament.cron.ts",
    "auth/auth.guard.ts",
    "!**/*.spec.ts",
    "!**/*.module.ts",
    "!**/dto/**",
    "!**/*.command.ts",
  ],
  coverageDirectory: "../coverage",
  coverageProvider: "v8",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/../test/jest.setup.ts"],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/$1",
    "^uuid$": "<rootDir>/../test/mocks/uuid.ts",
  },
  transformIgnorePatterns: ["node_modules/(?!uuid/)"],
  // Coverage runs are memory-heavy; cap workers locally (CI can override).
  maxWorkers: process.env.CI ? "50%" : 2,
};

export default config;
