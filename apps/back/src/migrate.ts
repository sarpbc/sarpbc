import { Migrator } from "@mikro-orm/migrations";
import { MikroORM } from "@mikro-orm/postgresql";
import config from "./mikro-orm.config";

async function migrate(): Promise<void> {
  const orm = new MikroORM({ ...config, extensions: [Migrator] });
  try {
    await orm.migrator.up();
  } finally {
    await orm.close(true);
  }
}

void migrate();
