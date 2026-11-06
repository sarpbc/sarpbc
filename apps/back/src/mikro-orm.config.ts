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
  entities: mikroOrmEntities,
  dbName: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  host: env.DB_HOST,
  port: env.DB_PORT,
  namingStrategy: SarpbcNamingStrategy,
  // MikroORM v7 PoolConfig: min, max, idleTimeoutMillis only (pg reap/acquire timeouts removed from API).
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 30000,
  },
  highlighter: new SqlHighlighter(),
  debug: !env.production,
  logger: (message: string) => log.debug({ component: "MikroORMCLI", message }),
  schemaGenerator: {
    defaultUpdateRule: "cascade",
  },
  migrations: {
    path: "dist/infrastructure/database/migrations",
    pathTs: "src/infrastructure/database/migrations",
    glob: "!(*.d).{js,ts}",
    transactional: true,
    disableForeignKeys: true,
    allOrNothing: true,
    dropTables: true,
    safe: false,
    emit: "ts",
  },
});
