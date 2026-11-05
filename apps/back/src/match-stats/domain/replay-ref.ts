import { InvalidInputError } from "../../common/domain/errors";

const REPLAY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseBallchasingReplayId(input: string): string {
  const value = input.trim();
  let candidate = value;
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw invalidReplay();
    }
    const [kind, id] = url.pathname.split("/").filter(Boolean);
    if (url.hostname.replace(/^www\./, "") !== "ballchasing.com" || kind !== "replay" || !id)
      throw invalidReplay();
    candidate = id;
  }
  if (!REPLAY_ID.test(candidate)) throw invalidReplay();
  return candidate.toLowerCase();
}

function invalidReplay(): InvalidInputError {
  return new InvalidInputError({
    message:
      "Enter a Ballchasing replay link (https://ballchasing.com/replay/…) or the replay id from that link.",
    code: "invalid_ballchasing_replay",
  });
}
