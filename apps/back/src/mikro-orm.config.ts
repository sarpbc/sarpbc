import { defineConfig } from "@mikro-orm/postgresql";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";
import { Logger } from "@nestjs/common";
import * as dotenv from "dotenv";
import { getDatabasePassword } from "./common/envirronement/secrets";

dotenv.config();

const logger = new Logger("MikroORMCLI");

export default defineConfig({
  entities: ["dist/**/*.entity.js"],
  entitiesTs: ["src/**/*.entity.ts"],
  dbName: process.env.DB_NAME || "sarpbc",
  user: process.env.DB_USER || "sarpbc",
  password: getDatabasePassword(),
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433", 10),
  metadataProvider: TsMorphMetadataProvider,
  highlighter: new SqlHighlighter(),
  debug: process.env.NODE_ENV !== "production",
  logger: logger.log.bind(logger),
  migrations: {
    path: "dist/migrations",
    pathTs: "src/migrations",
    glob: "!(*.d).{js,ts}",
    transactional: true,
    disableForeignKeys: true,
    allOrNothing: true,
    dropTables: true,
    safe: false,
    emit: "ts",
  },
});
