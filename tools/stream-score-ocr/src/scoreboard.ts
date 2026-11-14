import { colorDistance, meanColor, scaleRegion } from "./frame.ts";
import type { Frame } from "./frame.ts";
import { readText } from "./glyph.ts";
import type { GlyphSettings } from "./glyph.ts";
import type { Anchor, GlyphTemplate, Overlay, Region } from "./overlay.ts";

export type ScoreboardReading =
  | { kind: "hidden" }
  | { kind: "unreadable" }
  | {
      kind: "score";
      blue: number;
      orange: number;
      clock: number;
      overtime: boolean;
      confidence: number;
    };

const SCORE_TEXT = /^\d{1,2}$/;
const CLOCK_TEXT = /^(?<overtime>\+?)(?<minutes>\d{1,2}):(?<seconds>\d{2})$/;
const DIGITS = new Set("0123456789");
const CLOCK_CHARS = new Set("0123456789:+");

function matches(frame: Frame, overlay: Overlay, anchor: Anchor): boolean {
  const region = scaleRegion(anchor.region, overlay.reference, frame);

  return colorDistance(meanColor(frame, region), anchor.color) <= anchor.tolerance;
}

function readRegion(
  frame: Frame,
  overlay: Overlay,
  region: Region,
  templates: readonly GlyphTemplate[],
): { text: string; confidence: number } | null {
  const settings: GlyphSettings = { threshold: overlay.text.threshold, size: overlay.glyph };

  return readText(frame, scaleRegion(region, overlay.reference, frame), settings, templates);
}

export function readScoreboard(frame: Frame, overlay: Overlay): ScoreboardReading {
  const visible =
    overlay.visibleWhen.every((anchor) => matches(frame, overlay, anchor)) &&
    !overlay.ignoreWhen.some((anchor) => matches(frame, overlay, anchor));

  if (!visible) {
    return { kind: "hidden" };
  }

  const digits = overlay.templates.filter((template) => DIGITS.has(template.char));
  const clockGlyphs = overlay.templates.filter((template) => CLOCK_CHARS.has(template.char));
  const blue = readRegion(frame, overlay, overlay.regions.blue, digits);
  const orange = readRegion(frame, overlay, overlay.regions.orange, digits);
  const clock = readRegion(frame, overlay, overlay.regions.clock, clockGlyphs);

  if (blue === null || orange === null || clock === null) {
    return { kind: "unreadable" };
  }

  const clockParts = CLOCK_TEXT.exec(clock.text);

  if (!SCORE_TEXT.test(blue.text) || !SCORE_TEXT.test(orange.text) || clockParts === null) {
    return { kind: "unreadable" };
  }

  const seconds = Number(clockParts.groups?.seconds);
  const confidence = Math.min(blue.confidence, orange.confidence, clock.confidence);

  if (seconds > 59 || confidence < overlay.text.minConfidence) {
    return { kind: "unreadable" };
  }

  return {
    kind: "score",
    blue: Number(blue.text),
    orange: Number(orange.text),
    clock: Number(clockParts.groups?.minutes) * 60 + seconds,
    overtime: clockParts.groups?.overtime === "+",
    confidence,
  };
}
