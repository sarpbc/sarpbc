import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { R2Service, type ObjectOperationLogger } from "./r2.service";
import { StorageService } from "../application/storage.service";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

describe("R2Service", () => {
  const configuredValues = {
    r2_account_id: "acct",
    r2_endpoint: "https://acct.r2.cloudflarestorage.com",
    r2_access_key_id: "key",
    r2_secret_access_key: "secret",
    r2_bucket: "sarpbc-org",
    r2_public_base_url: "https://cdn.example",
  } as const;

  const logError = vi.fn<ObjectOperationLogger["error"]>();

  const operationLogger: ObjectOperationLogger = {
    set: () => {},
    error: logError,
    emit: () => {},
  };

  let sendSpy: MockInstance;
  let r2: R2Service;
  let service: StorageService;

  beforeEach(() => {
    sendSpy = vi.spyOn(S3Client.prototype, "send").mockImplementation(() => {});
    r2 = new R2Service(new ConfigService(configuredValues), () => operationLogger);
    service = new StorageService(r2);
    vi.clearAllMocks();
  });

  afterEach(() => {
    sendSpy.mockRestore();
  });

  it("stores a jpg declared as image/jpg", async () => {
    const result = await service.uploadImage(Buffer.from("jpeg"), "image/jpg", "news");

    expect(result.key).toMatch(/^news\/covers\/.+\.jpg$/);
    expect(result.publicUrl).toContain(result.key);
    const input: unknown = expect.objectContaining({ Key: result.key, ContentType: "image/jpeg" });

    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ input }));
  });

  it("rejects unsupported types before calling R2", async () => {
    await expect(
      service.uploadImage(Buffer.from("x"), "application/pdf", "tournament"),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("logs R2 failures with image context and returns a safe 500", async () => {
    sendSpy.mockRejectedValue(new Error("AccessDenied"));

    await expect(
      service.uploadImage(Buffer.from("jpeg"), "image/jpeg", "news"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(logError).toHaveBeenCalled();
  });

  it("stores tournament artwork separately from news covers", async () => {
    const buffer = Buffer.from("png");
    const result = await service.uploadImage(buffer, "image/png", "tournament");

    expect(result.key).toMatch(/^tournaments\/images\/.+\.png$/);
    expect(result.publicUrl).toBe(`https://cdn.example/${result.key}`);

    const input: unknown = expect.objectContaining({
      Key: result.key,
      Body: buffer,
      ContentType: "image/png",
    });

    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ input }));
  });

  it("stores an object under its exact key with immutable caching", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const key = "teams/kc/logo-light-0123456789abcdef.webp";

    await expect(r2.putObject(key, bytes, "image/webp")).resolves.toEqual({
      key,
      publicUrl: `https://cdn.example/${key}`,
    });
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "sarpbc-org",
          Key: key,
          Body: bytes,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        },
      }),
    );
  });

  it("hides R2 failures behind a safe 500 when storing an object", async () => {
    sendSpy.mockRejectedValue(new Error("AccessDenied"));

    await expect(
      r2.putObject("teams/kc/logo-dark-a.webp", new Uint8Array([1]), "image/webp"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(logError).toHaveBeenCalled();
  });

  it("publishes a pending object by copying it under its final key", async () => {
    await expect(
      r2.copyObject(
        "pending/teams/kc/logo-dark-0123456789abcdef.webp",
        "teams/kc/logo-dark-0123456789abcdef.webp",
      ),
    ).resolves.toEqual({
      key: "teams/kc/logo-dark-0123456789abcdef.webp",
      publicUrl: "https://cdn.example/teams/kc/logo-dark-0123456789abcdef.webp",
    });
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "sarpbc-org",
          CopySource: "sarpbc-org/pending/teams/kc/logo-dark-0123456789abcdef.webp",
          Key: "teams/kc/logo-dark-0123456789abcdef.webp",
        },
      }),
    );
  });

  it("hides R2 failures behind a safe 500 when copying an object", async () => {
    sendSpy.mockRejectedValue(new Error("AccessDenied"));

    await expect(
      r2.copyObject("pending/teams/kc/a.webp", "teams/kc/a.webp"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("deletes an object by key", async () => {
    await r2.deleteObject("pending/teams/kc/logo-dark-0123456789abcdef.webp");

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "sarpbc-org",
          Key: "pending/teams/kc/logo-dark-0123456789abcdef.webp",
        },
      }),
    );
  });

  it("fails with a clear error when R2 is not configured", async () => {
    const unconfigured = new R2Service(
      new ConfigService({ r2_bucket: "sarpbc-org" }),
      () => operationLogger,
    );

    await expect(unconfigured.deleteObject("teams/kc/logo.webp")).rejects.toThrow(
      /R2 storage is not configured/,
    );
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
