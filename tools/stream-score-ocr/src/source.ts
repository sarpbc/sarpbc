import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { isLiquipediaSourceHost } from "@sarpbc/utils/source-host";
import { readPpmFrames } from "./frame.ts";
import type { Frame } from "./frame.ts";

const URL_INPUT = /^[a-z][a-z0-9+.-]*:\/\//iu;

export interface SourceSettings {
  input: string;
  live: boolean;
  quality: string;
  intervalSeconds: number;
}

export interface TimedFrame {
  t: number;
  frame: Frame;
}

export const checkInput = (input: string, live: boolean): void => {
  if (!URL_INPUT.test(input)) {
    if (live) {
      throw new Error("A live source must be a stream URL.");
    }

    return;
  }

  const url = new URL(input);

  if (url.protocol !== "https:") {
    throw new Error("Stream URLs must use https.");
  }

  if (isLiquipediaSourceHost(url.hostname)) {
    throw new Error("Liquipedia is not an accepted source.");
  }
};

const stopOnExit =
  (processes: readonly ChildProcess[]): (() => void) =>
  () => {
    for (const child of processes) {
      if (child.exitCode === null) {
        child.kill();
      }
    }
  };

export const streamFrames = async function* streamFrames(
  settings: SourceSettings,
): AsyncGenerator<TimedFrame> {
  checkInput(settings.input, settings.live);
  const decoderInput = settings.live ? "pipe:0" : settings.input;

  const decoder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      decoderInput,
      "-vf",
      `fps=1/${settings.intervalSeconds}`,
      "-f",
      "image2pipe",
      "-vcodec",
      "ppm",
      "pipe:1",
    ],
    { stdio: [settings.live ? "pipe" : "ignore", "pipe", "inherit"] },
  );

  const processes: ChildProcess[] = [decoder];

  if (settings.live) {
    const capture = spawn("streamlink", ["--stdout", settings.input, settings.quality], {
      stdio: ["ignore", "pipe", "inherit"],
    });

    processes.push(capture);

    if (capture.stdout !== null && decoder.stdin !== null) {
      capture.stdout.pipe(decoder.stdin);
    }
  }

  const stop = stopOnExit(processes);

  const exited = Promise.withResolvers<number | null>();

  decoder.once("error", exited.reject);
  decoder.once("close", exited.resolve);
  exited.promise.catch(() => null);

  try {
    if (decoder.stdout === null) {
      throw new Error("ffmpeg has no output stream.");
    }

    let index = 0;

    for await (const frame of readPpmFrames(decoder.stdout)) {
      yield { t: index * settings.intervalSeconds, frame };
      index += 1;
    }

    const code = await exited.promise;

    if (code !== 0) {
      throw new Error(`ffmpeg exited with code ${code}.`);
    }
  } finally {
    stop();
  }
};
