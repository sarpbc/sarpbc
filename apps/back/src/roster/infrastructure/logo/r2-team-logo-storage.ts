import type { StorageService } from "../../../storage/application/storage.service";
import type { TeamLogoStorage } from "../../application/ports";

export class R2TeamLogoStorage implements TeamLogoStorage {
  constructor(private readonly storage: StorageService) {}

  async put(key: string, bytes: Uint8Array, contentType: "image/webp"): Promise<string> {
    return (await this.storage.putObject(key, bytes, contentType)).publicUrl;
  }
}
