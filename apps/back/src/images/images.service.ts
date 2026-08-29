import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
import { createLogger } from "evlog";
import { currentEnvironment } from "../common/request-log-context";
import { Image } from "./domain/image.entity";
import { ImageRepository } from "./images.repository";

export interface UploadUrlResponse {
  uploadURL: string;
  imageId: string;
}

export interface ImageResponse {
  id: string;
  imageId: string;
  url: string;
  createdAt: Date;
}

@Injectable()
export class ImagesService {
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly accountHash: string;

  constructor(
    private readonly imageRepository: ImageRepository,
    private readonly configService: ConfigService,
  ) {
    this.accountId = this.configService.get<string>("cloudflare_account_id") ?? "";
    this.apiToken = this.configService.get<string>("cloudflare_api_token") ?? "";
    this.accountHash = this.configService.get<string>("cloudflare_account_hash") ?? "";
  }

  private ensureCredentials(): void {
    if (!this.accountId || !this.apiToken || !this.accountHash) {
      throw new InternalServerErrorException("Cloudflare credentials are not configured");
    }
  }

  async getUploadUrl(userId?: string, userEmail?: string): Promise<UploadUrlResponse> {
    const log = createLogger({
      component: ImagesService.name,
      action: "getUploadUrl",
      environment: currentEnvironment(),
      userId,
      userEmail,
    });

    try {
      this.ensureCredentials();

      const form = new FormData();
      form.append("requireSignedURLs", "false");

      const response = await axios.post<{
        result: { uploadURL: string; id: string };
      }>(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v2/direct_upload`,
        form,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      log.set({ imageId: response.data.result.id });
      return {
        uploadURL: response.data.result.uploadURL,
        imageId: response.data.result.id,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        log.error(error);
        throw error;
      }

      const axiosError = error instanceof AxiosError ? error : undefined;
      log.set({
        cloudflareStatus: axiosError?.response?.status,
      });
      log.error(error instanceof Error ? error : new Error(String(error)));
      throw new InternalServerErrorException(
        "Cloudflare could not issue an upload URL. Try again in a moment.",
      );
    } finally {
      log.emit();
    }
  }

  async saveImage(imageId: string, userId?: string, userEmail?: string): Promise<ImageResponse> {
    const log = createLogger({
      component: ImagesService.name,
      action: "saveImage",
      environment: currentEnvironment(),
      userId,
      userEmail,
      imageId,
    });

    try {
      this.ensureCredentials();

      const url = `https://imagedelivery.net/${this.accountHash}/${imageId}/public`;

      const image = new Image();
      image.imageId = imageId;
      image.url = url;

      const saved = await this.imageRepository.save(image);
      log.set({ storedImageId: saved.id, imageUrl: saved.url });

      return {
        id: saved.id,
        imageId: saved.imageId,
        url: saved.url,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        log.error(error);
        throw error;
      }

      log.error(error instanceof Error ? error : new Error(String(error)));
      throw new InternalServerErrorException(
        "The image uploaded, but saving its record failed. Try uploading again.",
      );
    } finally {
      log.emit();
    }
  }
}
