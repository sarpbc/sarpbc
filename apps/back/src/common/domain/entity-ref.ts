export type EntityRef = { kind: "publicId"; value: number } | { kind: "id"; value: string };

const PUBLIC_ID = /^[1-9]\d{0,9}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PUBLIC_ID = 2_147_483_647;

export function parseEntityRef(raw: string): EntityRef | null {
  if (PUBLIC_ID.test(raw)) {
    const value = Number(raw);
    return value <= MAX_PUBLIC_ID ? { kind: "publicId", value } : null;
  }
  return UUID.test(raw) ? { kind: "id", value: raw.toLowerCase() } : null;
}
