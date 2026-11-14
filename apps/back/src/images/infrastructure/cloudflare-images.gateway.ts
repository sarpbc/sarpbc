import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
import { createLogger } from "evlog";
import { nodeEnvironment } from "../../infrastructure/config/env.validation";
import type { ImageHost, ImageUploadUrl } from "../application/ports/image.repository";

interface CloudflareCredentials {
  accountId: string;
  apiToken: string;
  accountHash: string;
}

@Injectable()
export class CloudflareImagesGateway implements ImageHost {
  constructor(private readonly configService: ConfigService) {}

  private credentials(): CloudflareCredentials {
    const accountId = this.configService.get<string>("cloudflare_account_id");
    const apiToken = this.configService.get<string>("cloudflare_api_token");
    const accountHash = this.configService.get<string>("cloudflare_account_hash");

    if (
      accountId === undefined ||
      accountId === "" ||
      apiToken === undefined ||
      apiToken === "" ||
      accountHash === undefined ||
      accountHash === ""
    ) {
      throw new InternalServerErrorException("Cloudflare credentials are not configured");
    }

    return { accountId, apiToken, accountHash };
  }

  async createUploadUrl(): Promise<ImageUploadUrl> {
    const { accountId, apiToken } = this.credentials();

    const log = createLogger({
      component: CloudflareImagesGateway.name,
      action: "createUploadUrl",
      environment: nodeEnvironment(),
    });

    try {
      const form = new FormData();
      form.append("requireSignedURLs", "false");

      const response = await axios.post<{
        result: { uploadURL: string; id: string };
      }>(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
        form,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        },
      );

      log.set({ imageId: response.data.result.id });

      return {
        uploadURL: response.data.result.uploadURL,
        imageId: response.data.result.id,
      };
    } catch (error) {
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
    return `https://imagedelivery.net/${this.credentials().accountHash}/${imageId}/public`;
  }
}
