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
  source: string | null;
  sourceUrl: string | null;
  createdAt: Date;
}

export interface ImageListResponse {
  data: ImageResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface SaveR2ImageInput {
  key: string;
  url: string;
  source: string;
  sourceUrl: string;
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

  private mapImage(image: Image): ImageResponse {
    return {
      id: image.id,
      imageId: image.imageId,
      url: image.url,
      source: image.source,
      sourceUrl: image.sourceUrl,
      createdAt: image.createdAt,
    };
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

  async saveImage(
    imageId: string,
    source?: string,
    sourceUrl?: string,
    userId?: string,
    userEmail?: string,
  ): Promise<ImageResponse> {
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
      image.source = source ?? null;
      image.sourceUrl = sourceUrl ?? null;

      const saved = await this.imageRepository.save(image);
      log.set({ storedImageId: saved.id, imageUrl: saved.url });

      return this.mapImage(saved);
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

  async saveR2Image(
    input: SaveR2ImageInput,
    userId?: string,
    userEmail?: string,
  ): Promise<ImageResponse> {
    const log = createLogger({
      component: ImagesService.name,
      action: "saveR2Image",
      environment: currentEnvironment(),
      userId,
      userEmail,
      imageKey: input.key,
    });

    try {
      const image = new Image();
      image.imageId = input.key;
      image.url = input.url;
      image.source = input.source;
      image.sourceUrl = input.sourceUrl;

      const saved = await this.imageRepository.save(image);
      log.set({ storedImageId: saved.id, imageUrl: saved.url });

      return this.mapImage(saved);
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      throw new InternalServerErrorException(
        "The image uploaded, but saving its record failed. Try uploading again.",
      );
    } finally {
      log.emit();
    }
  }

  async findAll(page: number, limit: number): Promise<ImageListResponse> {
    const [images, total] = await this.imageRepository.findPage(page, limit);
    return {
      data: images.map((image) => this.mapImage(image)),
      total,
      page,
      limit,
    };
  }
}
