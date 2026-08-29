import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const CONTENT_TYPE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export interface R2UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface R2UploadResponse {
  publicUrl: string;
  key: string;
}

@Injectable()
export class R2Service {
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

  private extensionForContentType(contentType: string, filename?: string): string {
    if (
      contentType === "image/jpeg" ||
      contentType === "image/png" ||
      contentType === "image/webp" ||
      contentType === "image/gif"
    ) {
      return CONTENT_TYPE_EXTENSIONS[contentType];
    }
    if (filename) {
      const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
      if (match?.[1]) {
        return match[1];
      }
    }
    return "bin";
  }

  async createNewsCoverUploadUrl(
    contentType: string,
    filename?: string,
  ): Promise<R2UploadUrlResponse> {
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException(
        "Cover image must be JPEG, PNG, WebP, or GIF. Choose a supported file type.",
      );
    }

    const extension = this.extensionForContentType(contentType, filename);
    const key = `news/covers/${randomUUID()}.${extension}`;
    const client = this.getClient();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    const publicBase = this.publicBaseUrl.replace(/\/$/, "");
    const publicUrl = `${publicBase}/${key}`;

    return { uploadUrl, publicUrl, key };
  }

  async uploadNewsCover(
    buffer: Buffer,
    contentType: string,
    filename?: string,
  ): Promise<R2UploadResponse> {
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException(
        "Cover image must be JPEG, PNG, WebP, or GIF. Choose a supported file type.",
      );
    }

    const extension = this.extensionForContentType(contentType, filename);
    const key = `news/covers/${randomUUID()}.${extension}`;
    const client = this.getClient();

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const publicBase = this.publicBaseUrl.replace(/\/$/, "");
    const publicUrl = `${publicBase}/${key}`;

    return { publicUrl, key };
  }
}
