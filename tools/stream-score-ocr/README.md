# stream-score-ocr

Prototype that reads Rocket League series scores from an organiser's official stream so staff can
confirm manual tournament results almost live instead of the next day.

The tool only proposes. It has no database or API access. Staff paste its JSON in the admin
(tournament page, **Stream Score** on a manual match), check each game against the stream and the
organiser's official post, choose which team played blue, and confirm the series winner in one
click. The official post stays the confirmation.

## Requirements

- Node.js from `.nvmrc` (runs the TypeScript sources directly).
- `ffmpeg` on the `PATH` to decode recorded files or streams.
- `streamlink` on the `PATH` for `--live` Twitch, YouTube or other supported streams.

## Read a series

```sh
pnpm --filter @sarpbc/stream-score-ocr read \
  --overlay overlays/coupe-de-france-slash-2026.json \
  --input vods/group-a-match-1.mp4 --best-of 5 --out group-a-match-1.json

pnpm --filter @sarpbc/stream-score-ocr read \
  --overlay overlays/coupe-de-france-slash-2026.json \
  --input https://www.twitch.tv/<channel> --live --out live.json
```

Paths are relative to `tools/stream-score-ocr`. `--interval` (seconds between frames, default 1)
and `--stable` (identical readings before a score counts, default 2) tune the sampling. With
`--out`, the file is rewritten after every finished game, so a live proposal can be checked while the
series is still being played. Reading stops once a side has won the series.

Each frame is classified as a scoreboard reading, hidden (no scorebug, replay banner, fade, ad or
desk) or unreadable (a glyph whose match margin, 1 minus the ratio of the best to the second-best
template distance, is below `minConfidence`). A score only counts after `--stable`
consecutive identical readings and never decreases within a game. A game ends when:

| `endedBy`    | Evidence                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| `regulation` | The clock reads 0:00 with an untied score                                |
| `overtime`   | The score changes after the clock switched to `+m:ss`                    |
| `reset`      | The next kickoff (0-0, clock back up) appears before either of the above |
| `stream_end` | The input ends during overtime or at 0:00                                |

A game that reached overtime or 0:00 tied, then was followed by a kickoff without a readable deciding
goal, is kept with `winner: null` and confidence 0. The admin marks it **Not Read** and the series
winner stays empty until the games read prove it. A game restarted during regulation (a remake) is
dropped.

## Output

```json
{
  "overlay": "coupe-de-france-slash-2026",
  "source": "vods/group-a-match-1.mp4",
  "sourceStartedAt": null,
  "bestOf": 5,
  "games": [
    {
      "number": 1,
      "blue": 3,
      "orange": 1,
      "winner": "blue",
      "endedBy": "regulation",
      "startedAt": 42,
      "endedAt": 391,
      "confidence": 0.98
    }
  ],
  "series": { "blue": 1, "orange": 0, "winner": null },
  "frames": { "read": 420, "accepted": 371, "hidden": 41, "unreadable": 8, "rejected": 0 }
}
```

`startedAt` and `endedAt` are seconds from the start of the input. `sourceStartedAt` is the wall clock
time a live capture started. `confidence` is the share of the game's scoreboard readings that agree
with the scores the tracker kept; misreads and rejected scores lower it. The admin flags a game below
0.9, and any game closed by `reset` or `stream_end`, for a closer check. The contract lives in
`@sarpbc/types` (`StreamScoreProposal`) and is validated by `parseStreamScoreProposal` in
`@sarpbc/utils`.

## Overlays

An overlay is data in `overlays/<id>.json`, so another organiser is a new file:

- `reference`: the frame size the regions are measured on. Regions scale to the stream resolution.
- `regions`: blue score, orange score and clock text boxes.
- `visibleWhen`: color anchors that must match for the scorebug to count as on screen.
- `ignoreWhen`: anchors that mark frames to skip, such as the replay banner.
- `text`: luminance threshold for the light text and the minimum glyph confidence.
- `glyph` and `templates`: the normalized glyph grid and one or more templates per character
  (`0`-`9`, `:`, `+`).

To add an organiser, measure the regions and anchors on a 1080p frame, then learn the templates from
labelled frames:

```sh
ffmpeg -ss 754 -i vod.mp4 -frames:v 1 frame.ppm
pnpm --filter @sarpbc/stream-score-ocr calibrate --overlay overlays/<id>.json \
  --frame frame.ppm --blue 3 --orange 1 --clock 2:34 > overlays/<id>.next.json
```

Repeat with frames that show the missing characters, including an overtime clock for `+`.

## Accuracy

`pnpm --filter @sarpbc/stream-score-ocr test` renders 12 generated series (56 games, Bo5 and Bo7,
1080p, 720p and 540p, pixel noise, corrupted frames, replays, fades, ad breaks, pauses, overtimes)
and compares the proposals with the scripted results:

| Sampling           | Correct game scores | Undecided games | Wrong scores | Series winners |
| ------------------ | ------------------- | --------------- | ------------ | -------------- |
| 1 frame per second | 56/56 (100%)        | 0               | 0            | 12/12          |
| 1 frame every 2 s  | 56/56 (100%)        | 0               | 0            | 12/12          |

In these fixtures an overtime winner stays on screen for only two seconds, so at 2 s a single
illegible frame leaves that game undecided rather than wrong. Keep the default 1 s interval for live
use.

### Limits

- The fixtures are generated frames, not recordings. The 2026 Coupe de France Slash group stage was
  broadcast on France Télévisions' Slash platform and no VOD was available locally or as a Twitch or
  YouTube replay, so the rate above has not been measured against official results yet.
- `overlays/coupe-de-france-slash-2026.json` describes a standard top-center scorebug. Its regions,
  anchor colors and templates must be calibrated on a real frame of the Slash broadcast before the
  first live use.
- Team names are not read: staff map the blue side to a team in the admin.
