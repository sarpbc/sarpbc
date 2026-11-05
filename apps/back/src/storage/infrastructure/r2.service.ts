import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { createLogger } from "evlog";
import { currentEnvironment } from "../../common/infrastructure/logging/request-log-context";
import type { ImageContentType } from "../domain/image-upload";
import type {
  ImageUploadContext,
  ObjectStorage,
  R2UploadResponse,
  R2UploadUrlResponse,
} from "../application/ports/object-storage";
import { IMAGE_PREFIXES, type ImageUploadTarget } from "../domain/image-target";

const CONTENT_TYPE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

@Injectable()
export class R2Service implements ObjectStorage {
  private readonly accountId: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private client: S3Client | null = null;

  constructor(private readonly configService: ConfigService) {
    this.accountId =
      this.configService.get<string>("r2_account_id") ??
      this.configService.get<string>("cloudflare_account_id") ??
      "";
    this.endpoint = this.configService.get<string>("r2_endpoint") ?? "";
    this.accessKeyId = this.configService.get<string>("r2_access_key_id") ?? "";
    this.secretAccessKey = this.configService.get<string>("r2_secret_access_key") ?? "";
    this.bucket = this.configService.get<string>("r2_bucket") ?? "sarpbc-org";
    this.publicBaseUrl = this.configService.get<string>("r2_public_base_url") ?? "";
  }

  private resolveEndpoint(): string {
    if (this.endpoint) {
      return this.endpoint.replace(/\/$/, "");
    }
    if (this.accountId) {
      return `https://${this.accountId}.r2.cloudflarestorage.com`;
    }
    return "";
  }

  private ensureConfigured(): void {
    const endpoint = this.resolveEndpoint();
    if (
      !endpoint ||
      !this.accessKeyId ||
      !this.secretAccessKey ||
      !this.bucket ||
      !this.publicBaseUrl
    ) {
      throw new InternalServerErrorException(
        "R2 storage is not configured. Set R2 credentials, R2_ENDPOINT (or R2_ACCOUNT_ID), and R2_PUBLIC_BASE_URL.",
      );
    }
  }

  private getClient(): S3Client {
    this.ensureConfigured();
    if (!this.client) {
      this.client = new S3Client({
        region: "auto",
        endpoint: this.resolveEndpoint(),
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
    }
    return this.client;
  }

  async createImageUploadUrl(
    contentType: ImageContentType,
    _filename: string | undefined,
    target: ImageUploadTarget,
  ): Promise<R2UploadUrlResponse> {
    const key = `${IMAGE_PREFIXES[target]}/${randomUUID()}.${CONTENT_TYPE_EXTENSIONS[contentType]}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.getClient(), command, { expiresIn: 600 });
    return { uploadUrl, publicUrl: this.publicUrl(key), key };
  }

  uploadImage(
    buffer: Uint8Array,
    contentType: ImageContentType,
    filename: string | undefined,
    context: ImageUploadContext,
  ): Promise<R2UploadResponse> {
    const key = `${IMAGE_PREFIXES[context.target]}/${randomUUID()}.${CONTENT_TYPE_EXTENSIONS[contentType]}`;
    return this.objectOperation(
      "uploadImage",
      {
        key,
        target: context.target,
        userId: context.userId,
        userEmail: context.userEmail,
        articleSlug: context.articleSlug,
        articleTitle: context.articleTitle,
        imageFilename: filename,
        imageContentType: contentType,
        imageSize: context.size ?? buffer.byteLength,
      },
      async (client) => {
        await client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          }),
        );
        return { publicUrl: this.publicUrl(key), key };
      },
      "Cover image could not be stored. Try again, or pick a different JPEG, PNG, WebP, or GIF.",
    );
  }

  putObject(key: string, bytes: Uint8Array, contentType: string): Promise<R2UploadResponse> {
    return this.objectOperation(
      "putObject",
      { key, imageContentType: contentType, imageSize: bytes.byteLength },
      async (client) => {
        await client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: bytes,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
        return { publicUrl: this.publicUrl(key), key };
      },
    );
  }

  copyObject(sourceKey: string, key: string): Promise<R2UploadResponse> {
    return this.objectOperation("copyObject", { sourceKey, key }, async (client) => {
      await client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: encodeURI(`${this.bucket}/${sourceKey}`),
          Key: key,
        }),
      );
      return { publicUrl: this.publicUrl(key), key };
    });
  }

  deleteObject(key: string): Promise<void> {
    return this.objectOperation("deleteObject", { key }, async (client) => {
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    });
  }

  private publicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }

  private async objectOperation<T>(
    action: string,
    fields: Record<string, string | number | undefined>,
    work: (client: S3Client) => Promise<T>,
    failureMessage = "The image could not be stored. Try again.",
  ): Promise<T> {
    const log = createLogger({
      component: R2Service.name,
      action,
      environment: currentEnvironment(),
      bucket: this.bucket,
      ...fields,
    });
    try {
      const result = await work(this.getClient());
      log.set({ stored: true });
      return result;
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(failureMessage);
    } finally {
      log.emit();
    }
  }
}
