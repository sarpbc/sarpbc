import type { Region } from "./overlay.ts";

export interface Frame {
  width: number;
  height: number;
  data: Uint8Array;
}

export type Rgb = readonly [number, number, number];

export interface Size {
  width: number;
  height: number;
}

const PPM_HEADER = /^P6\s+(\d+)\s+(\d+)\s+255\s/;
const MAX_PPM_HEADER = 64;

export function scaleRegion(region: Region, reference: Size, frame: Frame): Region {
  const sx = frame.width / reference.width;
  const sy = frame.height / reference.height;
  const x = Math.round(region.x * sx);
  const y = Math.round(region.y * sy);

  return {
    x,
    y,
    width: Math.max(1, Math.min(frame.width - x, Math.round(region.width * sx))),
    height: Math.max(1, Math.min(frame.height - y, Math.round(region.height * sy))),
  };
}

export function meanColor(frame: Frame, region: Region): Rgb {
  let red = 0;
  let green = 0;
  let blue = 0;

  for (let { y } = region; y < region.y + region.height; y++) {
    for (let { x } = region; x < region.x + region.width; x++) {
      const offset = (y * frame.width + x) * 3;
      red += frame.data[offset] ?? 0;
      green += frame.data[offset + 1] ?? 0;
      blue += frame.data[offset + 2] ?? 0;
    }
  }

  const pixels = region.width * region.height;

  return [red / pixels, green / pixels, blue / pixels];
}

export function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function parsePpmHeader(bytes: Uint8Array): { width: number; height: number; size: number } | null {
  const text = Buffer.from(bytes.subarray(0, MAX_PPM_HEADER)).toString("latin1");
  const match = PPM_HEADER.exec(text);

  if (match === null) {
    if (bytes.length >= MAX_PPM_HEADER) throw new Error("Invalid PPM header.");

    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (width < 1 || height < 1) throw new Error("Invalid PPM size.");

  return { width, height, size: match[0].length };
}

export async function* readPpmFrames(chunks: AsyncIterable<Uint8Array>): AsyncGenerator<Frame> {
  let header = new Uint8Array(0);
  let target: Frame | null = null;
  let filled = 0;

  for await (const chunk of chunks) {
    let input = chunk;

    while (input.length > 0) {
      if (target === null) {
        const joined = new Uint8Array(header.length + input.length);
        joined.set(header);
        joined.set(input, header.length);
        const parsed = parsePpmHeader(joined);

        if (parsed === null) {
          header = joined;
          break;
        }

        target = {
          width: parsed.width,
          height: parsed.height,
          data: new Uint8Array(parsed.width * parsed.height * 3),
        };
        filled = 0;
        header = new Uint8Array(0);
        input = joined.subarray(parsed.size);
        continue;
      }

      const taken = Math.min(input.length, target.data.length - filled);
      target.data.set(input.subarray(0, taken), filled);
      filled += taken;
      input = input.subarray(taken);

      if (filled === target.data.length) {
        yield target;
        target = null;
      }
    }
  }

  if (target !== null || header.length > 0) throw new Error("Truncated PPM stream.");
}
