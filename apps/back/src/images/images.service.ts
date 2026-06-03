import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
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

  async getUploadUrl(): Promise<UploadUrlResponse> {
    this.ensureCredentials();

    try {
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

      return {
        uploadURL: response.data.result.uploadURL,
        imageId: response.data.result.id,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new InternalServerErrorException(
          `Cloudflare API error (${error.response?.status}): ${JSON.stringify(error.response?.data) || error.message}`,
        );
      }
      throw error;
    }
  }

  async saveImage(imageId: string): Promise<ImageResponse> {
    this.ensureCredentials();

    const url = `https://imagedelivery.net/${this.accountHash}/${imageId}/public`;

    const image = new Image();
    image.imageId = imageId;
    image.url = url;

    const saved = await this.imageRepository.save(image);

    return {
      id: saved.id,
      imageId: saved.imageId,
      url: saved.url,
      createdAt: saved.createdAt,
    };
  }
}
