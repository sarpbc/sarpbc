import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
import { createLogger } from "evlog";
import { currentEnvironment } from "../../common/infrastructure/logging/request-log-context";
import type { ImageHost } from "../application/ports/image.repository";

export interface UploadUrlResponse {
  uploadURL: string;
  imageId: string;
}

@Injectable()
export class CloudflareImagesGateway implements ImageHost {
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly accountHash: string;

  constructor(private readonly configService: ConfigService) {
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
      component: CloudflareImagesGateway.name,
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

  imageUrl(imageId: string): string {
    this.ensureCredentials();
    return `https://imagedelivery.net/${this.accountHash}/${imageId}/public`;
  }
}
