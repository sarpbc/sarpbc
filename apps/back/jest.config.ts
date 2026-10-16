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
  collectCoverageFrom: [
    "pandascore/**/*.(t|j)s",
    "tournament/application/sync/**/*.(t|j)s",
    "tournament/infrastructure/jobs/tournament.cron.ts",
    "auth/infrastructure/http/auth.guard.ts",
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
    "^@sarpbc/utils$": "<rootDir>/../../../packages/utils/src/index.ts",
    "^@sarpbc/types$": "<rootDir>/../../../packages/types/src/index.ts",
  },
  transformIgnorePatterns: ["node_modules/(?!uuid|@sarpbc/)"],
  // Coverage runs are memory-heavy; cap workers locally (CI can override).
  maxWorkers: process.env.CI ? "50%" : 2,
};

export default config;
