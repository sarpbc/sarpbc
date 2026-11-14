import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { colorDistance, meanColor, readPpmFrames, scaleRegion, type Frame } from "./frame.ts";

function ppm(width: number, height: number, fill: number): Uint8Array {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "latin1");

  return Buffer.concat([header, Buffer.alloc(width * height * 3, fill)]);
}

async function* chunked(bytes: Uint8Array, size: number): AsyncGenerator<Uint8Array> {
  for (let offset = 0; offset < bytes.length; offset += size) {
    yield bytes.subarray(offset, offset + size);
  }
}

async function collect(chunks: AsyncIterable<Uint8Array>): Promise<Frame[]> {
  const frames: Frame[] = [];

  for await (const frame of readPpmFrames(chunks)) frames.push(frame);

  return frames;
}

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
    await assert.rejects(collect(chunked(ppm(4, 3, 0).subarray(0, 30), 8)), /Truncated/);
    await assert.rejects(collect(chunked(new Uint8Array(80), 16)), /Invalid PPM header/);
  });
});

void describe("frame regions", () => {
  void it("scales reference regions to the frame and averages their color", () => {
    const frame: Frame = { width: 960, height: 540, data: new Uint8Array(960 * 540 * 3).fill(100) };

    const region = scaleRegion(
      { x: 100, y: 50, width: 40, height: 20 },
      { width: 1920, height: 1080 },
      frame,
    );

    assert.deepEqual(region, { x: 50, y: 25, width: 20, height: 10 });
    assert.deepEqual(meanColor(frame, region), [100, 100, 100]);
    assert.equal(colorDistance([0, 0, 0], [3, 4, 0]), 5);
  });
});
