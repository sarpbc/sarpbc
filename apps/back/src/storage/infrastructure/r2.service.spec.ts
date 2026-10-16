import { InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { createLogger } from "evlog";
import { R2Service } from "./r2.service";
import { StorageService } from "../application/storage.service";
import { InvalidInputError } from "../../common/domain/errors";

describe("R2Service", () => {
  const logger = {
    set: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    emit: jest.fn(),
  };

  const configuredValues = {
    r2_account_id: "acct",
    r2_endpoint: "https://acct.r2.cloudflarestorage.com",
    r2_access_key_id: "key",
    r2_secret_access_key: "secret",
    r2_bucket: "sarpbc-org",
    r2_public_base_url: "https://cdn.example",
  } as const;

  let sendSpy: jest.SpyInstance;
  let service: StorageService;

  beforeEach(() => {
    (createLogger as jest.Mock).mockReturnValue(logger);
    sendSpy = jest.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);
    service = new StorageService(
      new R2Service({
        get: (key: string) => configuredValues[key as keyof typeof configuredValues],
      } as ConfigService),
    );
    jest.clearAllMocks();
    (createLogger as jest.Mock).mockReturnValue(logger);
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
});
