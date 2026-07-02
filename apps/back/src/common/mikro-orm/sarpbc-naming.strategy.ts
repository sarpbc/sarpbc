import { createHash } from "node:crypto";
import { UnderscoreNamingStrategy, type NamingStrategy } from "@mikro-orm/core";

const PG_IDENTIFIER_LIMIT = 63;

/**
 * Stable PostgreSQL identifiers for long auto-generated index/FK names.
 * Hashes the full UnderscoreNamingStrategy name when it would exceed 63 chars.
 */
export class SarpbcNamingStrategy extends UnderscoreNamingStrategy {
  indexName(
    tableName: string,
    columns: string[],
    type: Parameters<NamingStrategy["indexName"]>[2],
  ): string {
    const name = super.indexName(tableName, columns, type);

    if (name.length <= PG_IDENTIFIER_LIMIT) {
      return name;
    }

    const hash = createHash("sha256").update(name).digest("hex").slice(0, 8);
    const prefix = `${tableName}_${type}_`;
    const remaining = PG_IDENTIFIER_LIMIT - prefix.length - hash.length - 1;
    const columnPart = columns.join("_").slice(0, Math.max(remaining, 8));

    return `${prefix}${columnPart}_${hash}`;
  }
}
