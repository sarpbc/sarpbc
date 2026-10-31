import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from "vitest";
import { InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { createLogger } from "evlog";
import { R2Service } from "./r2.service";
import { StorageService } from "../application/storage.service";
import { InvalidInputError } from "../../common/domain/errors";

describe("R2Service", () => {
  const logger = {
    set: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    emit: vi.fn(),
  };

  const configuredValues = {
    r2_account_id: "acct",
    r2_endpoint: "https://acct.r2.cloudflarestorage.com",
    r2_access_key_id: "key",
    r2_secret_access_key: "secret",
    r2_bucket: "sarpbc-org",
    r2_public_base_url: "https://cdn.example",
  } as const;

  let sendSpy: MockInstance;
  let service: StorageService;

  beforeEach(() => {
    (createLogger as Mock).mockReturnValue(logger);
    sendSpy = vi.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);
    service = new StorageService(
      new R2Service({
        get: (key: string) => configuredValues[key as keyof typeof configuredValues],
      } as ConfigService),
    );
    vi.clearAllMocks();
    (createLogger as Mock).mockReturnValue(logger);
  });

  afterEach(() => {
    sendSpy.mockRestore();
  });

  it("stores a jpg declared as image/jpg", async () => {
    const result = await service.uploadImage(Buffer.from("jpeg"), "image/jpg", "cover.jpg", {
      target: "news",
      userId: "user-1",
      userEmail: "editor@sarpbc.org",
      articleSlug: "vitality-win",
      articleTitle: "Vitality win",
    });

    expect(result.key).toMatch(/^news\/covers\/.+\.jpg$/);
    expect(result.publicUrl).toContain(result.key);
    expect(createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "uploadImage",
        target: "news",
        userId: "user-1",
        userEmail: "editor@sarpbc.org",
        articleSlug: "vitality-win",
        articleTitle: "Vitality win",
        imageFilename: "cover.jpg",
        imageContentType: "image/jpeg",
        imageDeclaredContentType: "image/jpeg",
        environment: expect.any(String),
      }),
    );
    expect(logger.emit).toHaveBeenCalled();
  });

  it("rejects unsupported types before calling R2", async () => {
    await expect(
      service.uploadImage(Buffer.from("x"), "application/pdf", "doc.pdf", { target: "tournament" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("logs R2 failures with image context and returns a safe 500", async () => {
    sendSpy.mockRejectedValue(new Error("AccessDenied"));

    await expect(
      service.uploadImage(Buffer.from("jpeg"), "image/jpeg", "cover.jpg", {
        target: "news",
        userId: "user-1",
        articleSlug: "vitality-win",
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(logger.error).toHaveBeenCalled();
    expect(logger.emit).toHaveBeenCalled();
  });

  it("stores tournament artwork separately from news covers", async () => {
    const buffer = Buffer.from("png");
    const result = await service.uploadImage(buffer, "image/png", "ewc.png", {
      target: "tournament",
    });

    expect(result.key).toMatch(/^tournaments\/images\/.+\.png$/);
    expect(result.publicUrl).toBe(`https://cdn.example/${result.key}`);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ Key: result.key, Body: buffer, ContentType: "image/png" }),
      }),
    );
  });

  it("stores an object under its exact key with immutable caching", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const key = "teams/kc/logo-light-0123456789abcdef.webp";

    await expect(service.putObject(key, bytes, "image/webp")).resolves.toEqual({
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
      service.putObject("teams/kc/logo-dark-a.webp", new Uint8Array([1]), "image/webp"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(logger.error).toHaveBeenCalled();
  });

  it("publishes a pending object by copying it under its final key", async () => {
    await expect(
      service.copyObject(
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

  it("deletes an object by key", async () => {
    await service.deleteObject("pending/teams/kc/logo-dark-0123456789abcdef.webp");

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "sarpbc-org",
          Key: "pending/teams/kc/logo-dark-0123456789abcdef.webp",
        },
      }),
    );
  });
});
