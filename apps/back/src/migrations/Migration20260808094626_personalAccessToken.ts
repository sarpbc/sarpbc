import { Migration } from "@mikro-orm/migrations";

export class Migration20260808094626_personalAccessToken extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "personal_access_token" ("id" uuid not null default gen_random_uuid(), "owner_id" uuid not null, "name" varchar(255) not null, "token_hash" varchar(255) not null, "created_at" timestamptz not null default now(), "last_used_at" timestamptz null, "revoked_at" timestamptz null, primary key ("id"));`,
    );
    this.addSql(
      `create index "personal_access_token_owner_id_index" on "personal_access_token" ("owner_id");`,
    );
    this.addSql(
      `alter table "personal_access_token" add constraint "personal_access_token_token_hash_unique" unique ("token_hash");`,
    );

    this.addSql(
      `alter table "personal_access_token" add constraint "personal_access_token_owner_id_foreign" foreign key ("owner_id") references "user" ("id") on update cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "personal_access_token" cascade;`);
  }
}
