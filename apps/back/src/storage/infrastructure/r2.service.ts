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
import { nodeEnvironment } from "../../infrastructure/config/env.validation";
import {
  IMAGE_FILE_EXTENSIONS,
  type ImageContentType,
  type ImageUploadTarget,
} from "@sarpbc/utils";
import type {
  ObjectStorage,
  ObjectUploadUrl,
  StoredObject,
} from "../application/ports/object-storage";
import { IMAGE_PREFIXES } from "../domain/image-target";

interface R2Connection {
  client: S3Client;
  publicUrl(key: string): string;
}

@Injectable()
export class R2Service implements ObjectStorage {
  private connection: R2Connection | null = null;

  constructor(private readonly configService: ConfigService) {}

  private connect(): R2Connection {
    if (this.connection) {
      return this.connection;
    }

    const accountId = this.configService.get<string>("r2_account_id");
    const endpoint =
      this.configService.get<string>("r2_endpoint")?.replace(/\/$/, "") ??
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
    const accessKeyId = this.configService.get<string>("r2_access_key_id");
    const secretAccessKey = this.configService.get<string>("r2_secret_access_key");
    const publicBaseUrl = this.configService.get<string>("r2_public_base_url");
    if (!endpoint || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
      throw new InternalServerErrorException(
        "R2 storage is not configured. Set R2 credentials, R2_ENDPOINT (or R2_ACCOUNT_ID), and R2_PUBLIC_BASE_URL.",
      );
    }

    this.connection = {
      client: new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      }),
      publicUrl: (key) => `${publicBaseUrl.replace(/\/$/, "")}/${key}`,
    };
    return this.connection;
  }

  private get bucket(): string {
    return this.configService.getOrThrow<string>("r2_bucket");
  }

  async createImageUploadUrl(
    contentType: ImageContentType,
    target: ImageUploadTarget,
  ): Promise<ObjectUploadUrl> {
    const { client, publicUrl } = this.connect();
    const key = imageKey(target, contentType);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    return { uploadUrl, publicUrl: publicUrl(key), key };
  }

  uploadImage(
    buffer: Uint8Array,
    contentType: ImageContentType,
    target: ImageUploadTarget,
  ): Promise<StoredObject> {
    const key = imageKey(target, contentType);
    return this.objectOperation(
      "uploadImage",
      { key, target, imageContentType: contentType, imageSize: buffer.byteLength },
      async ({ client, publicUrl }) => {
        await client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          }),
        );
        return { publicUrl: publicUrl(key), key };
      },
      "Image could not be stored. Try again, or pick a different JPEG, PNG, WebP, or GIF.",
    );
  }

  putObject(key: string, bytes: Uint8Array, contentType: string): Promise<StoredObject> {
    return this.objectOperation(
      "putObject",
      { key, imageContentType: contentType, imageSize: bytes.byteLength },
      async ({ client, publicUrl }) => {
        await client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: bytes,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
        return { publicUrl: publicUrl(key), key };
      },
    );
  }

  copyObject(sourceKey: string, key: string): Promise<StoredObject> {
    return this.objectOperation("copyObject", { sourceKey, key }, async ({ client, publicUrl }) => {
      await client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: encodeURI(`${this.bucket}/${sourceKey}`),
          Key: key,
        }),
      );
      return { publicUrl: publicUrl(key), key };
    });
  }

  deleteObject(key: string): Promise<void> {
    return this.objectOperation("deleteObject", { key }, async ({ client }) => {
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    });
  }

  private async objectOperation<T>(
    action: string,
    fields: Record<string, string | number | undefined>,
    work: (connection: R2Connection) => Promise<T>,
    failureMessage = "The image could not be stored. Try again.",
  ): Promise<T> {
    const connection = this.connect();
    const log = createLogger({
      component: R2Service.name,
      action,
      environment: nodeEnvironment(),
      bucket: this.bucket,
      ...fields,
    });
    try {
      const result = await work(connection);
      log.set({ stored: true });
      return result;
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      throw new InternalServerErrorException(failureMessage);
    } finally {
      log.emit();
    }
  }
}

function imageKey(target: ImageUploadTarget, contentType: ImageContentType): string {
  return `${IMAGE_PREFIXES[target]}/${randomUUID()}.${IMAGE_FILE_EXTENSIONS[contentType]}`;
}
