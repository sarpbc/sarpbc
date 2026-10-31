import { EventEmitter } from "node:events";
import { lookup, type LookupOptions } from "node:dns";
import type { RequestOptions } from "node:https";
import { request } from "node:https";
import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadPublicHttps, isPublicAddress } from "./public-https-download";

vi.mock("node:https", () => ({ request: vi.fn() }));
vi.mock("node:dns", () => ({ lookup: vi.fn() }));

type Reply = { status: number; headers?: Record<string, string>; body?: string[] } | "hang";

const limits = { maxBytes: 16, timeoutMs: 1_000, maxRedirects: 2 };

function resolveDns(addresses: Record<string, string[]>) {
  vi.mocked(lookup).mockImplementation(((
    hostname: string,
    _options: LookupOptions,
    callback: (error: Error | null, addresses: { address: string; family: number }[]) => void,
  ) =>
    callback(
      null,
      (addresses[hostname] ?? []).map((address) => ({
        address,
        family: address.includes(":") ? 6 : 4,
      })),
    )) as never);
}

function serve(routes: Record<string, Reply>) {
  vi.mocked(request).mockImplementation(((url: URL, options: RequestOptions) => {
    const req = Object.assign(new EventEmitter(), {
      end: () =>
        options.lookup!(url.hostname, { all: true }, (error) => {
          if (error) {
            req.emit("error", error);
            return;
          }
          const reply = routes[url.href];
          if (!reply) throw new Error(`Unexpected request to ${url.href}`);
          if (reply === "hang") {
            options.signal!.addEventListener("abort", () =>
              req.emit("error", new Error("aborted")),
            );
            return;
          }
          const response = Object.assign(new PassThrough(), {
            statusCode: reply.status,
            headers: reply.headers ?? {},
          });
          req.emit("response", response);
          for (const chunk of reply.body ?? []) response.write(chunk);
          response.end();
        }),
    });
    return req;
  }) as never);
}

const download = (url: string, overrides: Partial<typeof limits> = {}) =>
  downloadPublicHttps(new URL(url), { ...limits, ...overrides });

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00:ec2::254",
    "::ffff:127.0.0.1",
    "::ffff:a9fe:a9fe",
    "64:ff9b::a9fe:a9fe",
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["8.8.8.8", "104.16.0.1", "2606:4700:4700::1111"])("allows %s", (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});

describe("downloadPublicHttps", () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
    resolveDns({
      "kcorp.gg": ["104.16.0.1"],
      "cdn.kcorp.gg": ["104.16.0.2", "2606:4700::1"],
      "internal.kcorp.gg": ["104.16.0.3", "10.0.0.5"],
      "metadata.kcorp.gg": ["169.254.169.254"],
    });
  });

  it("downloads a public https resource through the guarded DNS lookup", async () => {
    serve({ "https://kcorp.gg/logo.png": { status: 200, body: ["logo", "bytes"] } });

    const bytes = await download("https://kcorp.gg/logo.png");

    expect(new TextDecoder().decode(bytes)).toBe("logobytes");
    expect(vi.mocked(request).mock.calls[0]![1]).toMatchObject({ method: "GET", agent: false });
  });

  it.each([
    ["http://kcorp.gg/logo.png", "must use https"],
    ["https://127.0.0.1/logo.png", "private, loopback or link-local"],
    ["https://[::1]/logo.png", "private, loopback or link-local"],
    ["https://169.254.169.254/latest/meta-data", "private, loopback or link-local"],
    ["https://localhost/logo.png", "private, loopback or link-local"],
    ["https://user:pass@kcorp.gg/logo.png", "credentials"],
    ["https://kcorp.gg:8443/logo.png", "default https port"],
  ])("rejects %s before connecting", async (url, message) => {
    await expect(download(url)).rejects.toThrow(message);
    expect(request).not.toHaveBeenCalled();
  });

  it.each(["https://metadata.kcorp.gg/logo.png", "https://internal.kcorp.gg/logo.png"])(
    "rejects %s when any resolved address is private",
    async (url) => {
      serve({ [url]: { status: 200, body: ["secret"] } });

      await expect(download(url)).rejects.toThrow("private, loopback or link-local");
    },
  );

  it("follows a redirect to another public https host", async () => {
    serve({
      "https://kcorp.gg/logo.png": { status: 302, headers: { location: "https://cdn.kcorp.gg/a" } },
      "https://cdn.kcorp.gg/a": { status: 200, body: ["ok"] },
    });

    expect(new TextDecoder().decode(await download("https://kcorp.gg/logo.png"))).toBe("ok");
  });

  it.each([
    ["http://cdn.kcorp.gg/a", "must use https"],
    ["https://10.0.0.1/a", "private, loopback or link-local"],
    ["https://metadata.kcorp.gg/a", "private, loopback or link-local"],
  ])("re-checks the redirect target %s", async (location, message) => {
    serve({
      "https://kcorp.gg/logo.png": { status: 301, headers: { location } },
      [location]: { status: 200, body: ["secret"] },
    });

    await expect(download("https://kcorp.gg/logo.png")).rejects.toThrow(message);
  });

  it("stops after the redirect limit", async () => {
    serve({
      "https://kcorp.gg/a": { status: 302, headers: { location: "/b" } },
      "https://kcorp.gg/b": { status: 302, headers: { location: "/c" } },
      "https://kcorp.gg/c": { status: 302, headers: { location: "/d" } },
    });

    await expect(download("https://kcorp.gg/a")).rejects.toThrow("redirected too many times");
  });

  it("rejects a declared or streamed body above the limit", async () => {
    serve({
      "https://kcorp.gg/declared": {
        status: 200,
        headers: { "content-length": "17" },
        body: ["x"],
      },
      "https://kcorp.gg/streamed": { status: 200, body: ["0123456789", "0123456789"] },
    });

    await expect(download("https://kcorp.gg/declared")).rejects.toThrow("larger than");
    await expect(download("https://kcorp.gg/streamed")).rejects.toThrow("larger than");
  });

  it("reports HTTP errors and timeouts", async () => {
    serve({
      "https://kcorp.gg/missing": { status: 404 },
      "https://kcorp.gg/slow": "hang",
    });

    await expect(download("https://kcorp.gg/missing")).rejects.toThrow("answered HTTP 404");
    await expect(download("https://kcorp.gg/slow", { timeoutMs: 20 })).rejects.toThrow("timed out");
  });
});
