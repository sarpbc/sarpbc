import { downloadPublicHttps } from "../../../infrastructure/http/public-https-download";
import type { TeamLogoSource } from "../../application/ports";

export class HttpsTeamLogoSource implements TeamLogoSource {
  download(url: URL, maxBytes: number): Promise<Uint8Array> {
    return downloadPublicHttps(url, { maxBytes, timeoutMs: 10_000, maxRedirects: 3 });
  }
}
