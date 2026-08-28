import type { OfficialMatchStream } from "src/tournament/domain/official-match-stream";
import type { MatchStreamDto } from "../../infrastructure/dto/match.dto";

const MAX_OFFICIAL_STREAMS = 12;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function mapOfficialMatchStreams(
  streams: MatchStreamDto[] | undefined,
): OfficialMatchStream[] {
  if (!streams || streams.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const official: OfficialMatchStream[] = [];

  for (const stream of streams) {
    if (!stream.official) {
      continue;
    }

    const url = stream.raw_url?.trim();
    if (!url || !isHttpUrl(url) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    official.push({
      url,
      language: stream.language?.trim() ?? "",
      main: Boolean(stream.main),
    });

    if (official.length >= MAX_OFFICIAL_STREAMS) {
      break;
    }
  }

  return official;
}
