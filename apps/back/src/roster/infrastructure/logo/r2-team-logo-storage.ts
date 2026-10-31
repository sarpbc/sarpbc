import type { StorageService } from "../../../storage/application/storage.service";
import type { StoredTeamLogo, TeamLogoStorage } from "../../application/ports";

export class R2TeamLogoStorage implements TeamLogoStorage {
  constructor(private readonly storage: StorageService) {}

  async put(key: string, bytes: Uint8Array, contentType: "image/webp"): Promise<StoredTeamLogo> {
    const { publicUrl } = await this.storage.putObject(key, bytes, contentType);
    return { key, url: publicUrl };
  }

  async copy(sourceKey: string, key: string): Promise<StoredTeamLogo> {
    const { publicUrl } = await this.storage.copyObject(sourceKey, key);
    return { key, url: publicUrl };
  }

  delete(key: string): Promise<void> {
    return this.storage.deleteObject(key);
  }
}
