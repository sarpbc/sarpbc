import { InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { nodeEnvironment } from "../../infrastructure/config/env.validation";
import { IMAGE_FILE_EXTENSIONS } from "@sarpbc/utils";
import type { ImageContentType, ImageUploadTarget } from "@sarpbc/utils";
import type { ObjectStorage } from "../application/ports/object-storage";
import { IMAGE_PREFIXES } from "../domain/image-target";

interface R2Connection {
  client: S3Client;
  publicUrl: (key: string) => string;
}

export interface ObjectOperationLogger {
  set: (fields: { stored: boolean }) => void;
  error: (error: Error) => void;
  emit: () => void;
}

export type ObjectOperationLoggerFactory = (
  context: Record<string, string | number | undefined>,
) => ObjectOperationLogger;

const imageKey = (target: ImageUploadTarget, contentType: ImageContentType) =>
  `${IMAGE_PREFIXES[target]}/${randomUUID()}.${IMAGE_FILE_EXTENSIONS[contentType]}`;

export class R2Service implements ObjectStorage {
  private connection: R2Connection | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly createLogger: ObjectOperationLoggerFactory,
  ) {}

  private connect() {
    if (this.connection) {
      return this.connection;
    }

    const accountId = this.configService.get<string>("r2_account_id");

    const endpoint =
      this.configService.get<string>("r2_endpoint")?.replace(/\/$/u, "") ??
      (accountId !== undefined && accountId !== ""
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : undefined);

    const accessKeyId = this.configService.get<string>("r2_access_key_id");
    const secretAccessKey = this.configService.get<string>("r2_secret_access_key");
    const publicBaseUrl = this.configService.get<string>("r2_public_base_url");

    if (
      endpoint === undefined ||
      endpoint === "" ||
      accessKeyId === undefined ||
      accessKeyId === "" ||
      secretAccessKey === undefined ||
      secretAccessKey === "" ||
      publicBaseUrl === undefined ||
      publicBaseUrl === ""
    ) {
      throw new InternalServerErrorException(
        "R2 storage is not configured. Set R2 credentials, R2_ENDPOINT (or R2_ACCOUNT_ID), and R2_PUBLIC_BASE_URL.",
      );
    }

    this.connection = {
      client: new S3Client({
        credentials: { accessKeyId, secretAccessKey },
        endpoint,
        region: "auto",
      }),
      publicUrl: (key) => `${publicBaseUrl.replace(/\/$/u, "")}/${key}`,
    };

    return this.connection;
  }

  private get bucket() {
    return this.configService.getOrThrow<string>("r2_bucket");
  }

  async createImageUploadUrl(contentType: ImageContentType, target: ImageUploadTarget) {
    const { client, publicUrl } = this.connect();
    const key = imageKey(target, contentType);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      ContentType: contentType,
      Key: key,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

    return { key, publicUrl: publicUrl(key), uploadUrl };
  }

  async uploadImage(buffer: Uint8Array, contentType: ImageContentType, target: ImageUploadTarget) {
    const key = imageKey(target, contentType);

    return await this.objectOperation(
      "uploadImage",
      { imageContentType: contentType, imageSize: buffer.byteLength, key, target },
      async ({ client, publicUrl }) => {
        await client.send(
          new PutObjectCommand({
            Body: buffer,
            Bucket: this.bucket,
            ContentType: contentType,
            Key: key,
          }),
        );

        return { key, publicUrl: publicUrl(key) };
      },
      "Image could not be stored. Try again, or pick a different JPEG, PNG, WebP, or GIF.",
    );
  }

  async putObject(key: string, bytes: Uint8Array, contentType: string) {
    return await this.objectOperation(
      "putObject",
      { imageContentType: contentType, imageSize: bytes.byteLength, key },
      async ({ client, publicUrl }) => {
        await client.send(
          new PutObjectCommand({
            Body: bytes,
            Bucket: this.bucket,
            CacheControl: "public, max-age=31536000, immutable",
            ContentType: contentType,
            Key: key,
          }),
        );

        return { key, publicUrl: publicUrl(key) };
      },
    );
  }

  async copyObject(sourceKey: string, key: string) {
    return await this.objectOperation(
      "copyObject",
      { key, sourceKey },
      async ({ client, publicUrl }) => {
        await client.send(
          new CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: encodeURI(`${this.bucket}/${sourceKey}`),
            Key: key,
          }),
        );

        return { key, publicUrl: publicUrl(key) };
      },
    );
  }

  async deleteObject(key: string) {
    await this.objectOperation("deleteObject", { key }, async ({ client }) => {
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    });
  }

  private async objectOperation<T>(
    action: string,
    fields: Record<string, string | number | undefined>,
    work: (connection: R2Connection) => Promise<T>,
    failureMessage = "The image could not be stored. Try again.",
  ) {
    const connection = this.connect();

    const log = this.createLogger({
      action,
      bucket: this.bucket,
      component: R2Service.name,
      environment: nodeEnvironment(),
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
