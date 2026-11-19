import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { colorDistance, meanColor, readPpmFrames, scaleRegion } from "./frame.ts";
import type { Frame } from "./frame.ts";

const ppm = (width: number, height: number, fill: number) => {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "latin1");

  return Buffer.concat([header, Buffer.alloc(width * height * 3, fill)]);
};

const chunked = async function* chunked(bytes: Uint8Array, size: number) {
  for (let offset = 0; offset < bytes.length; offset += size) {
    yield bytes.subarray(offset, offset + size);
  }
};

const collect = async (chunks: AsyncIterable<Uint8Array>) => {
  const frames: Frame[] = [];

  for await (const frame of readPpmFrames(chunks)) {
    frames.push(frame);
  }

  return frames;
};

void describe("readPpmFrames", () => {
  void it("splits a pipe of frames whatever the chunk boundaries", async () => {
    const stream = Buffer.concat([ppm(4, 3, 10), ppm(2, 2, 200)]);

    const results = await Promise.all(
      [1, 5, 7, 4096].map(async (size) => await collect(chunked(stream, size))),
    );

    for (const frames of results) {
      assert.deepEqual(
        frames.map((frame) => [frame.width, frame.height, frame.data[0], frame.data.length]),
        [
          [4, 3, 10, 36],
          [2, 2, 200, 12],
        ],
      );
    }
  });

  void it("rejects truncated and foreign streams", async () => {
    await assert.rejects(collect(chunked(ppm(4, 3, 0).subarray(0, 30), 8)), /Truncated/u);
    await assert.rejects(collect(chunked(new Uint8Array(80), 16)), /Invalid PPM header/u);
  });
});

void describe("frame regions", () => {
  void it("scales reference regions to the frame and averages their color", () => {
    const frame: Frame = { data: new Uint8Array(960 * 540 * 3).fill(100), height: 540, width: 960 };

    const region = scaleRegion(
      { height: 20, width: 40, x: 100, y: 50 },
      { height: 1080, width: 1920 },
      frame,
    );

    assert.deepEqual(region, { height: 10, width: 20, x: 50, y: 25 });
    assert.deepEqual(meanColor(frame, region), [100, 100, 100]);
    assert.equal(colorDistance([0, 0, 0], [3, 4, 0]), 5);
  });
});
