import { downloadPublicHttps } from "../../../infrastructure/http/public-https-download";
import type { PublicHttpsTransport } from "../../../infrastructure/http/public-https-download";
import type { TeamLogoSource } from "../../application/ports";
import { isLiquipediaSourceHost } from "@sarpbc/utils";

export class HttpsTeamLogoSource implements TeamLogoSource {
  constructor(private readonly transport: PublicHttpsTransport) {}

  async download(url: URL, maxBytes: number): Promise<Uint8Array> {
    return await downloadPublicHttps(
      url,
      {
        isAllowedHost: (hostname) => !isLiquipediaSourceHost(hostname),
        maxBytes,
        maxRedirects: 3,
        timeoutMs: 10_000,
      },
      this.transport,
    );
  }
}
