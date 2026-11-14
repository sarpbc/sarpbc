import type { Frame, Size } from "./frame.ts";
import type { GlyphTemplate, Region } from "./overlay.ts";

export interface GlyphSettings {
  threshold: number;
  size: Size;
}

export interface TextRead {
  text: string;
  confidence: number;
}

const SHIFTS = [-1, 0, 1] as const;

interface Mask {
  width: number;
  height: number;
  ink: Uint8Array;
}

interface Span {
  left: number;
  right: number;
}

function inkMask(frame: Frame, region: Region, threshold: number): Mask {
  const ink = new Uint8Array(region.width * region.height);

  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      const offset = ((region.y + y) * frame.width + region.x + x) * 3;

      const luminance =
        0.2126 * (frame.data[offset] ?? 0) +
        0.7152 * (frame.data[offset + 1] ?? 0) +
        0.0722 * (frame.data[offset + 2] ?? 0);

      ink[y * region.width + x] = luminance >= threshold ? 1 : 0;
    }
  }

  return { width: region.width, height: region.height, ink };
}

function columnInk(mask: Mask, x: number): number {
  let total = 0;

  for (let y = 0; y < mask.height; y += 1) total += mask.ink[y * mask.width + x] ?? 0;

  return total;
}

function glyphSpans(mask: Mask): Span[] {
  const minInk = Math.max(2, Math.round(mask.height * 0.1));
  const spans: Span[] = [];
  let left = -1;
  let ink = 0;

  for (let x = 0; x <= mask.width; x += 1) {
    const column = x < mask.width ? columnInk(mask, x) : 0;
    const bridged = left >= 0 && x + 1 < mask.width && columnInk(mask, x + 1) > 0;

    if (column > 0 || bridged) {
      if (left < 0) left = x;
      ink += column;
      continue;
    }

    if (left >= 0 && ink >= minInk) spans.push({ left, right: x - 1 });
    left = -1;
    ink = 0;
  }

  return spans;
}

function lineExtent(mask: Mask, spans: readonly Span[]): { top: number; bottom: number } | null {
  let top = -1;
  let bottom = -1;

  for (let y = 0; y < mask.height; y += 1) {
    let inked = 0;

    for (const span of spans) {
      for (let x = span.left; x <= span.right; x += 1) inked += mask.ink[y * mask.width + x] ?? 0;
    }

    if (inked < 2) continue;

    if (top < 0) top = y;
    bottom = y;
  }

  return top < 0 ? null : { top, bottom };
}

function coverage(mask: Mask, x0: number, x1: number, y0: number, y1: number): number {
  const left = Math.floor(x0);
  const right = Math.max(left + 1, Math.ceil(x1));
  const top = Math.floor(y0);
  const bottom = Math.max(top + 1, Math.ceil(y1));
  let inked = 0;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) inked += mask.ink[y * mask.width + x] ?? 0;
  }

  return inked / ((right - left) * (bottom - top));
}

export function glyphGrids(frame: Frame, region: Region, settings: GlyphSettings): Float32Array[] {
  const mask = inkMask(frame, region, settings.threshold);
  const spans = glyphSpans(mask);
  const line = lineExtent(mask, spans);

  if (line === null) return [];
  const { width, height } = settings.size;
  const lineHeight = line.bottom - line.top + 1;
  const scale = height / lineHeight;

  return spans.map((span) => {
    const spanWidth = span.right - span.left + 1;
    const scaledWidth = Math.min(width, Math.max(1, Math.round(spanWidth * scale)));
    const offset = Math.floor((width - scaledWidth) / 2);
    const grid = new Float32Array(width * height);

    for (let cy = 0; cy < height; cy += 1) {
      const y0 = line.top + (cy * lineHeight) / height;
      const y1 = line.top + ((cy + 1) * lineHeight) / height;

      for (let cx = 0; cx < scaledWidth; cx += 1) {
        const x0 = span.left + (cx * spanWidth) / scaledWidth;
        const x1 = span.left + ((cx + 1) * spanWidth) / scaledWidth;
        grid[cy * width + offset + cx] = coverage(mask, x0, x1, y0, y1);
      }
    }

    return grid;
  });
}

function shiftedDistance(
  grid: Float32Array,
  template: GlyphTemplate,
  dx: number,
  dy: number,
): number {
  let distance = 0;

  for (const [y, row] of template.rows.entries()) {
    for (let x = 0; x < row.length; x += 1) {
      const expected = row[x] === "#" ? 1 : 0;
      const sx = x + dx;
      const sy = y + dy;
      const inside = sx >= 0 && sx < row.length && sy >= 0 && sy < template.rows.length;
      const sampled = inside && (grid[sy * row.length + sx] ?? 0) >= 0.5 ? 1 : 0;
      distance += Math.abs(sampled - expected);
    }
  }

  return distance / grid.length;
}

function templateDistance(grid: Float32Array, template: GlyphTemplate): number {
  let best = Infinity;

  for (const dy of SHIFTS) {
    for (const dx of SHIFTS) best = Math.min(best, shiftedDistance(grid, template, dx, dy));
  }

  return best;
}

function classify(
  grid: Float32Array,
  templates: readonly GlyphTemplate[],
): { char: string; confidence: number } | null {
  const best = new Map<string, number>();

  for (const template of templates) {
    const distance = templateDistance(grid, template);
    best.set(template.char, Math.min(best.get(template.char) ?? Infinity, distance));
  }

  const ranked = [...best].toSorted((a, b) => a[1] - b[1]);
  const [first, second] = ranked;

  if (first === undefined) return null;

  const confidence =
    second === undefined || second[1] === 0 ? 1 - first[1] : 1 - first[1] / second[1];

  return { char: first[0], confidence };
}

export function readText(
  frame: Frame,
  region: Region,
  settings: GlyphSettings,
  templates: readonly GlyphTemplate[],
): TextRead | null {
  const grids = glyphGrids(frame, region, settings);

  if (grids.length === 0) return null;
  let text = "";
  let confidence = 1;

  for (const grid of grids) {
    const glyph = classify(grid, templates);

    if (glyph === null) return null;
    text += glyph.char;
    confidence = Math.min(confidence, glyph.confidence);
  }

  return { text, confidence };
}

export function templateFromGrid(char: string, grid: Float32Array, size: Size): GlyphTemplate {
  const rows: string[] = [];

  for (let y = 0; y < size.height; y += 1) {
    let row = "";

    for (let x = 0; x < size.width; x += 1)
      row += (grid[y * size.width + x] ?? 0) >= 0.5 ? "#" : ".";
    rows.push(row);
  }

  return { char, rows };
}
