import type { ObjectStorage } from "../../../storage/application/ports/object-storage";
import type { TeamLogoStorage } from "../../application/ports";

export class R2TeamLogoStorage implements TeamLogoStorage {
  constructor(private readonly storage: ObjectStorage) {}

  async put(key: string, bytes: Uint8Array, contentType: "image/webp") {
    const { publicUrl } = await this.storage.putObject(key, bytes, contentType);

    return { key, url: publicUrl };
  }

  async copy(sourceKey: string, key: string) {
    const { publicUrl } = await this.storage.copyObject(sourceKey, key);

    return { key, url: publicUrl };
  }

  async delete(key: string) {
    await this.storage.deleteObject(key);
  }
}
