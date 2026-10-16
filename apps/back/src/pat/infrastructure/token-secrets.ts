import { createHash, randomBytes } from "node:crypto";
import type { TokenSecrets } from "../application/ports/token-store";

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const tokenSecrets: TokenSecrets = {
  hash,
  issue: () => {
    const raw = `sarpbc_pat_${randomBytes(32).toString("base64url")}`;
    return { raw, hash: hash(raw) };
  },
};
