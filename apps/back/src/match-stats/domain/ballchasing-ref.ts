import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export const BALLCHASING_HOST = "ballchasing.com";

const REFS = {
  group: { id: /^[a-z0-9][a-z0-9-]{2,99}$/iu, normalize: (id: string) => id },
  replay: {
    id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,
    normalize: (id: string) => id.toLowerCase(),
  },
} as const;

export type BallchasingRefKind = keyof typeof REFS;

const invalidRef = (kind: BallchasingRefKind): InvalidInputError =>
  new InvalidInputError({
    message: `Enter a Ballchasing ${kind} link (https://${BALLCHASING_HOST}/${kind}/…) or the ${kind} id from that link.`,
    code: `invalid_ballchasing_${kind}`,
  });

export const parseBallchasingRef = (kind: BallchasingRefKind, input: string): string => {
  const value = input.trim();
  let candidate = value;

  if (/^https?:\/\//iu.test(value)) {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw invalidRef(kind);
    }

    const [pathKind, id] = url.pathname.split("/").filter(Boolean);

    if (url.hostname.replace(/^www\./u, "") !== BALLCHASING_HOST || pathKind !== kind || !id) {
      throw invalidRef(kind);
    }

    candidate = id;
  }

  if (!REFS[kind].id.test(candidate)) {
    throw invalidRef(kind);
  }

  return REFS[kind].normalize(candidate);
};
