import { defineConfig } from "@mikro-orm/postgresql";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";
import { log } from "evlog";
import * as dotenv from "dotenv";
import { loadDatabaseEnv } from "./infrastructure/config/env.validation";
import { SarpbcNamingStrategy } from "./infrastructure/database/sarpbc-naming.strategy";
import { mikroOrmEntities } from "./mikro-orm.entities";

dotenv.config();

const env = loadDatabaseEnv();

export default defineConfig({
  dbName: env.DB_NAME,
  debug: !env.production,
  entities: mikroOrmEntities,
  highlighter: new SqlHighlighter(),
  host: env.DB_HOST,
  logger: (message: string) => {
    log.debug({ component: "MikroORMCLI", message });
  },
  migrations: {
    allOrNothing: true,
    disableForeignKeys: true,
    dropTables: true,
    emit: "ts",
    glob: "!(*.d).{js,ts}",
    path: "dist/infrastructure/database/migrations",
    pathTs: "src/infrastructure/database/migrations",
    safe: false,
    transactional: true,
  },
  namingStrategy: SarpbcNamingStrategy,
  password: env.DB_PASSWORD,
  // MikroORM v7 PoolConfig: min, max, idleTimeoutMillis only (pg reap/acquire timeouts removed from API).
  pool: {
    idleTimeoutMillis: 30_000,
    max: 10,
    min: 0,
  },
  port: env.DB_PORT,
  schemaGenerator: {
    defaultUpdateRule: "cascade",
  },
  user: env.DB_USER,
});
