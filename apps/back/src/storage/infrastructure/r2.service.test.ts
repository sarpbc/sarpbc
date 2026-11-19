import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { R2Service } from "./r2.service";
import type { ObjectOperationLogger } from "./r2.service";
import { StorageService } from "../application/storage.service";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

describe(R2Service, () => {
  const configuredValues = {
    r2_access_key_id: "key",
    r2_account_id: "acct",
    r2_bucket: "sarpbc-org",
    r2_endpoint: "https://acct.r2.cloudflarestorage.com",
    r2_public_base_url: "https://cdn.example",
    r2_secret_access_key: "secret",
  } as const;

  const BUCKET_ORIGIN = "https://sarpbc-org.acct.r2.cloudflarestorage.com";
  const server = setupServer();

  interface ObjectRequest {
    method: string;
    path: string;
    headers: Headers;
    body: Uint8Array;
  }

  let requests: ObjectRequest[];
  let logged: Error[];
  let r2: R2Service;
  let service: StorageService;

  const operationLogger: ObjectOperationLogger = {
    emit: () => {},
    error: (error) => {
      logged.push(error);
    },
    set: () => {},
  };

  const serve = (status = 200) => {
    server.use(
      http.all(`${BUCKET_ORIGIN}/*`, async ({ request }) => {
        requests.push({
          body: new Uint8Array(await request.arrayBuffer()),
          headers: request.headers,
          method: request.method,
          path: decodeURIComponent(new URL(request.url).pathname),
        });

        return new HttpResponse(
          status === 200
            ? "<CopyObjectResult><ETag>etag</ETag></CopyObjectResult>"
            : "<Error><Code>AccessDenied</Code></Error>",
          { headers: { "Content-Type": "application/xml" }, status },
        );
      }),
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  beforeEach(() => {
    requests = [];
    logged = [];
    serve();
    r2 = new R2Service(new ConfigService(configuredValues), () => operationLogger);
    service = new StorageService(r2);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("stores a jpg declared as image/jpg", async () => {
    const result = await service.uploadImage(Buffer.from("jpeg"), "image/jpg", "news");

    expect(result.key).toMatch(/^news\/covers\/.+\.jpg$/u);
    expect(result.publicUrl).toContain(result.key);
    const [request] = requests;

    expect(request?.method).toBe("PUT");
    expect(request?.path).toBe(`/${result.key}`);
    expect(request?.headers.get("content-type")).toBe("image/jpeg");
  });

  it("rejects unsupported types before calling R2", async () => {
    await expect(
      service.uploadImage(Buffer.from("x"), "application/pdf", "tournament"),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(requests).toStrictEqual([]);
  });

  it("logs R2 failures with image context and returns a safe 500", async () => {
    serve(403);

    await expect(
      service.uploadImage(Buffer.from("jpeg"), "image/jpeg", "news"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(logged.map((error) => error.name)).toStrictEqual(["AccessDenied"]);
  });

  it("stores tournament artwork separately from news covers", async () => {
    const buffer = Buffer.from("png");
    const result = await service.uploadImage(buffer, "image/png", "tournament");

    expect(result.key).toMatch(/^tournaments\/images\/.+\.png$/u);
    expect(result.publicUrl).toBe(`https://cdn.example/${result.key}`);

    const [request] = requests;

    expect(request?.path).toBe(`/${result.key}`);
    expect(request?.headers.get("content-type")).toBe("image/png");
    expect(request?.body).toStrictEqual(new Uint8Array(buffer));
  });

  it("stores an object under its exact key with immutable caching", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const key = "teams/kc/logo-light-0123456789abcdef.webp";

    await expect(r2.putObject(key, bytes, "image/webp")).resolves.toStrictEqual({
      key,
      publicUrl: `https://cdn.example/${key}`,
    });
    const [request] = requests;

    expect({
      body: request?.body,
      cacheControl: request?.headers.get("cache-control"),
      contentType: request?.headers.get("content-type"),
      method: request?.method,
      path: request?.path,
    }).toStrictEqual({
      body: bytes,
      cacheControl: "public, max-age=31536000, immutable",
      contentType: "image/webp",
      method: "PUT",
      path: `/${key}`,
    });
  });

  it("hides R2 failures behind a safe 500 when storing an object", async () => {
    serve(403);

    await expect(
      r2.putObject("teams/kc/logo-dark-a.webp", new Uint8Array([1]), "image/webp"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(logged.map((error) => error.name)).toStrictEqual(["AccessDenied"]);
  });

  it("publishes a pending object by copying it under its final key", async () => {
    await expect(
      r2.copyObject(
        "pending/teams/kc/logo-dark-0123456789abcdef.webp",
        "teams/kc/logo-dark-0123456789abcdef.webp",
      ),
    ).resolves.toStrictEqual({
      key: "teams/kc/logo-dark-0123456789abcdef.webp",
      publicUrl: "https://cdn.example/teams/kc/logo-dark-0123456789abcdef.webp",
    });
    const [request] = requests;

    expect(request?.method).toBe("PUT");
    expect(request?.path).toBe("/teams/kc/logo-dark-0123456789abcdef.webp");
    expect(decodeURIComponent(request?.headers.get("x-amz-copy-source") ?? "")).toBe(
      "sarpbc-org/pending/teams/kc/logo-dark-0123456789abcdef.webp",
    );
  });

  it("hides R2 failures behind a safe 500 when copying an object", async () => {
    serve(403);

    await expect(
      r2.copyObject("pending/teams/kc/a.webp", "teams/kc/a.webp"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("deletes an object by key", async () => {
    await r2.deleteObject("pending/teams/kc/logo-dark-0123456789abcdef.webp");

    expect(requests.map(({ method, path }) => ({ method, path }))).toStrictEqual([
      { method: "DELETE", path: "/pending/teams/kc/logo-dark-0123456789abcdef.webp" },
    ]);
  });

  it("fails with a clear error when R2 is not configured", async () => {
    const unconfigured = new R2Service(
      new ConfigService({ r2_bucket: "sarpbc-org" }),
      () => operationLogger,
    );

    await expect(unconfigured.deleteObject("teams/kc/logo.webp")).rejects.toThrow(
      /R2 storage is not configured/u,
    );
    expect(requests).toStrictEqual([]);
  });
});
