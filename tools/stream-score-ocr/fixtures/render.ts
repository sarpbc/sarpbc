import type { Frame, Rgb, Size } from "../src/frame.ts";
import type { Region } from "../src/overlay.ts";

export interface ScorebugScene {
  kind: "scorebug";
  blue: number;
  orange: number;
  clock: number;
  overtime: boolean;
  replay: boolean;
  fade: number;
  glitch: boolean;
}

export type Scene = ScorebugScene | { kind: "hidden"; variant: number };

const FONT: ReadonlyMap<string, readonly string[]> = new Map([
  ["0", [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."]],
  ["1", ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."]],
  ["2", [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"]],
  ["3", ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."]],
  ["4", ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."]],
  ["5", ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."]],
  ["6", ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."]],
  ["7", ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."]],
  ["8", [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."]],
  ["9", [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."]],
  [":", [".", ".", "#", ".", "#", ".", "."]],
  ["+", [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."]],
]);

const FONT_PIXEL = 6;
const FONT_ROWS = 7;
const REFERENCE: Size = { width: 1920, height: 1080 };
const BAND: Region = { x: 760, y: 0, width: 400, height: 124 };
const PANEL: Region = { x: 780, y: 8, width: 360, height: 80 };
const BLUE_STRIP: Region = { x: 780, y: 86, width: 100, height: 10 };
const ORANGE_STRIP: Region = { x: 1040, y: 86, width: 100, height: 10 };
const REPLAY_BANNER: Region = { x: 860, y: 100, width: 200, height: 14 };

export const TEXT_REGIONS = {
  blue: { x: 790, y: 16, width: 80, height: 62 },
  clock: { x: 875, y: 16, width: 170, height: 62 },
  orange: { x: 1050, y: 16, width: 80, height: 62 },
} as const satisfies Record<string, Region>;

const PANEL_COLOR: Rgb = [18, 22, 38];
const BLUE_COLOR: Rgb = [25, 95, 225];
const ORANGE_COLOR: Rgb = [240, 125, 25];
const REPLAY_COLOR: Rgb = [230, 200, 40];
const TEXT_COLOR: Rgb = [245, 245, 245];
const NOISE_TABLE_SIZE = 2 ** 20;
const PRNG_MODULUS = 2_147_483_647;
const PRNG_MULTIPLIER = 48_271;

export function seededRandom(seed: number): () => number {
  let state = (Math.abs(Math.trunc(seed)) % (PRNG_MODULUS - 1)) + 1;

  return () => {
    state = (state * PRNG_MULTIPLIER) % PRNG_MODULUS;

    return state / PRNG_MODULUS;
  };
}

export function formatClock(seconds: number, overtime: boolean): string {
  const minutes = Math.floor(seconds / 60);

  return `${overtime ? "+" : ""}${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function rectCoverage(region: Region, x0: number, x1: number, y0: number, y1: number): number {
  return (
    (overlap(x0, x1, region.x, region.x + region.width) *
      overlap(y0, y1, region.y, region.y + region.height)) /
    ((x1 - x0) * (y1 - y0))
  );
}

function textInk(text: string) {
  const glyphs = Array.from(text, (char) => {
    const rows = FONT.get(char);

    if (rows === undefined) {
      throw new Error(`No fixture glyph for ${char}`);
    }

    return rows;
  });

  const ink: boolean[][] = Array.from({ length: FONT_ROWS }, () => []);

  for (const [index, rows] of glyphs.entries()) {
    if (index > 0) {
      for (const row of ink) {
        row.push(false);
      }
    }

    for (const [y, row] of rows.entries()) {
      ink[y]?.push(...Array.from(row, (cell) => cell === "#"));
    }
  }

  return { columns: ink[0]?.length ?? 0, ink };
}

function backgroundAt(x: number, y: number): Rgb {
  return [40 + ((x * 7 + y * 3) % 50), 70 + ((x + y) % 40), 60 + ((x * 3 + y * 5) % 45)];
}

function mix(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

export class FixtureRenderer {
  readonly frame: Frame;
  readonly #scale: number;
  readonly #jitterX: number;
  readonly #jitterY: number;
  readonly #band: Region;
  readonly #background: Float32Array;
  readonly #panels = new Map<boolean, Float32Array>();
  readonly #texts = new Map<string, Float32Array>();
  readonly #hidden = new Map<number, Float32Array>();
  readonly #noise: Float32Array;
  readonly #layer: Float32Array;
  readonly #pixels: Uint8ClampedArray;
  readonly #random: () => number;

  constructor(size: Size, seed: number) {
    this.#random = seededRandom(seed);
    this.#scale = size.width / REFERENCE.width;
    this.#jitterX = this.#random() - 0.5;
    this.#jitterY = this.#random() - 0.5;
    this.#band = {
      x: Math.floor(BAND.x * this.#scale),
      y: 0,
      width: Math.ceil(BAND.width * this.#scale),
      height: Math.ceil(BAND.height * this.#scale),
    };
    const data = new Uint8Array(size.width * size.height * 3);

    for (let y = 0; y < size.height; y += 1) {
      for (let x = 0; x < size.width; x += 1) {
        const offset = (y * size.width + x) * 3;
        data.set(backgroundAt(x, y), offset);
      }
    }

    this.frame = { width: size.width, height: size.height, data };
    this.#pixels = new Uint8ClampedArray(data.buffer);
    this.#background = this.#bandLayer((_x0, _x1, _y0, _y1, base) => base);
    this.#layer = new Float32Array(this.#background.length);
    this.#noise = new Float32Array(NOISE_TABLE_SIZE);

    for (let index = 0; index < NOISE_TABLE_SIZE; index += 1) {
      const radius = Math.sqrt(-2 * Math.log(1 - this.#random()));
      this.#noise[index] = radius * Math.cos(2 * Math.PI * this.#random());
    }
  }

  render(scene: Scene, noise: number): Frame {
    const layer =
      scene.kind === "scorebug" ? this.#scorebug(scene) : this.#hiddenLayer(scene.variant);

    const sigma = scene.kind === "scorebug" && scene.glitch ? 70 : noise;
    const start = Math.floor(this.#random() * (NOISE_TABLE_SIZE - layer.length));
    const band = this.#band;
    const table = this.#noise.subarray(start, start + layer.length);
    const rowLength = band.width * 3;
    const values = new Float32Array(rowLength);

    for (let y = 0; y < band.height; y += 1) {
      const source = y * rowLength;

      for (let index = 0; index < rowLength; index += 1) {
        values[index] = (layer[source + index] ?? 0) + (table[source + index] ?? 0) * sigma;
      }

      this.#pixels.set(values, ((band.y + y) * this.frame.width + band.x) * 3);
    }

    return this.frame;
  }

  #bandLayer(
    paint: (x0: number, x1: number, y0: number, y1: number, base: Rgb) => Rgb,
  ): Float32Array {
    const band = this.#band;
    const layer = new Float32Array(band.width * band.height * 3);

    for (let y = 0; y < band.height; y += 1) {
      for (let x = 0; x < band.width; x += 1) {
        const x0 = (band.x + x) / this.#scale - this.#jitterX;
        const y0 = (band.y + y) / this.#scale - this.#jitterY;
        const base = backgroundAt(band.x + x, band.y + y);
        layer.set(
          paint(x0, x0 + 1 / this.#scale, y0, y0 + 1 / this.#scale, base),
          (y * band.width + x) * 3,
        );
      }
    }

    return layer;
  }

  #panel(replay: boolean): Float32Array {
    const cached = this.#panels.get(replay);

    if (cached !== undefined) {
      return cached;
    }

    const layers: { region: Region; color: Rgb }[] = [
      { region: PANEL, color: PANEL_COLOR },
      { region: BLUE_STRIP, color: BLUE_COLOR },
      { region: ORANGE_STRIP, color: ORANGE_COLOR },
    ];

    if (replay) {
      layers.push({ region: REPLAY_BANNER, color: REPLAY_COLOR });
    }

    const layer = this.#bandLayer((x0, x1, y0, y1, base) => {
      let color = base;

      for (const { region, color: fill } of layers) {
        const amount = rectCoverage(region, x0, x1, y0, y1);
        color = [
          mix(color[0], fill[0], amount),
          mix(color[1], fill[1], amount),
          mix(color[2], fill[2], amount),
        ];
      }

      return color;
    });

    this.#panels.set(replay, layer);

    return layer;
  }

  #text(region: Region, text: string): Float32Array {
    const key = `${region.x}:${text}`;
    const cached = this.#texts.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const { columns, ink } = textInk(text);
    const originX = region.x + (region.width - columns * FONT_PIXEL) / 2;
    const originY = region.y + (region.height - FONT_ROWS * FONT_PIXEL) / 2;
    const band = this.#band;
    const coverage = new Float32Array(band.width * band.height);

    for (let y = 0; y < band.height; y += 1) {
      for (let x = 0; x < band.width; x += 1) {
        const x0 = (band.x + x) / this.#scale - this.#jitterX;
        const y0 = (band.y + y) / this.#scale - this.#jitterY;
        const x1 = x0 + 1 / this.#scale;
        const y1 = y0 + 1 / this.#scale;
        let area = 0;
        const firstColumn = Math.max(0, Math.floor((x0 - originX) / FONT_PIXEL));
        const lastColumn = Math.min(columns - 1, Math.floor((x1 - originX) / FONT_PIXEL));
        const firstRow = Math.max(0, Math.floor((y0 - originY) / FONT_PIXEL));
        const lastRow = Math.min(FONT_ROWS - 1, Math.floor((y1 - originY) / FONT_PIXEL));

        for (let row = firstRow; row <= lastRow; row += 1) {
          for (let column = firstColumn; column <= lastColumn; column += 1) {
            if (!ink[row]?.[column]) {
              continue;
            }

            const cellX = originX + column * FONT_PIXEL;
            const cellY = originY + row * FONT_PIXEL;
            area +=
              overlap(x0, x1, cellX, cellX + FONT_PIXEL) *
              overlap(y0, y1, cellY, cellY + FONT_PIXEL);
          }
        }

        coverage[y * band.width + x] = area / ((x1 - x0) * (y1 - y0));
      }
    }

    this.#texts.set(key, coverage);

    return coverage;
  }

  #scorebug(scene: ScorebugScene): Float32Array {
    const panel = this.#panel(scene.replay);
    const blue = this.#text(TEXT_REGIONS.blue, String(scene.blue));
    const clock = this.#text(TEXT_REGIONS.clock, formatClock(scene.clock, scene.overtime));
    const orange = this.#text(TEXT_REGIONS.orange, String(scene.orange));
    const layer = this.#layer;

    for (let pixel = 0; pixel < blue.length; pixel += 1) {
      const ink = Math.min(1, (blue[pixel] ?? 0) + (clock[pixel] ?? 0) + (orange[pixel] ?? 0));

      for (let channel = 0; channel < 3; channel += 1) {
        const index = pixel * 3 + channel;
        const drawn = mix(panel[index] ?? 0, TEXT_COLOR[channel] ?? 0, ink);
        layer[index] = mix(this.#background[index] ?? 0, drawn, scene.fade);
      }
    }

    return layer;
  }

  #hiddenLayer(variant: number): Float32Array {
    const cached = this.#hidden.get(variant);

    if (cached !== undefined) {
      return cached;
    }

    const random = seededRandom(variant * 7919 + 17);

    const blocks = Array.from({ length: 6 }, () => ({
      region: {
        x: BAND.x + random() * BAND.width,
        y: random() * BAND.height,
        width: 40 + random() * 200,
        height: 20 + random() * 80,
      },
      color: [random() * 255, random() * 255, random() * 255] as const,
    }));

    const layer = this.#bandLayer(
      (x0, x1, y0, y1, base) =>
        blocks.find(({ region }) => rectCoverage(region, x0, x1, y0, y1) > 0.5)?.color ?? base,
    );

    this.#hidden.set(variant, layer);

    return layer;
  }
}
