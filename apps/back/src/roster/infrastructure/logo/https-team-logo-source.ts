import {
  downloadPublicHttps,
  type PublicHttpsTransport,
} from "../../../infrastructure/http/public-https-download";
import type { TeamLogoSource } from "../../application/ports";
import { isLiquipediaSourceHost } from "@sarpbc/utils";

export class HttpsTeamLogoSource implements TeamLogoSource {
  constructor(private readonly transport: PublicHttpsTransport) {}

  async download(url: URL, maxBytes: number): Promise<Uint8Array> {
    return await downloadPublicHttps(
      url,
      {
        maxBytes,
        timeoutMs: 10_000,
        maxRedirects: 3,
        isAllowedHost: (hostname) => !isLiquipediaSourceHost(hostname),
      },
      this.transport,
    );
  }
}
