import { InvalidInputError } from "../../common/domain/errors";

const GROUP_ID = /^[a-z0-9][a-z0-9-]{2,99}$/i;

export function parseBallchasingGroupId(input: string): string {
  const value = input.trim();
  let candidate = value;
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw invalidGroup();
    }
    const [kind, id] = url.pathname.split("/").filter(Boolean);
    if (url.hostname.replace(/^www\./, "") !== "ballchasing.com" || kind !== "group" || !id)
      throw invalidGroup();
    candidate = id;
  }
  if (!GROUP_ID.test(candidate)) throw invalidGroup();
  return candidate;
}

function invalidGroup(): InvalidInputError {
  return new InvalidInputError({
    message:
      "Enter a Ballchasing group link (https://ballchasing.com/group/…) or the group id from that link.",
    code: "invalid_ballchasing_group",
  });
}
