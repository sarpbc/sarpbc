import { google } from "googleapis";
import { z } from "zod";
import { AuthenticationError } from "../../common/domain/errors";
import type {
  GoogleIdentity,
  GoogleProfile,
  OAuthReturnTo,
} from "../application/ports/authentication";

const profileSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1),
  picture: z.string().nullish(),
});

export class GoogleIdentityGateway implements GoogleIdentity {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  private client() {
    return new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  async profile(code: string): Promise<GoogleProfile> {
    const client = this.client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const { data } = await google.oauth2("v2").userinfo.get({ auth: client });
    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) {
      throw new AuthenticationError(
        "Google did not return a complete profile. Try again or use email and password.",
      );
    }
    return { ...parsed.data, picture: parsed.data.picture ?? null };
  }

  authorizationUrl(returnTo: OAuthReturnTo): string {
    return this.client().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["profile", "email"],
      state: returnTo,
    });
  }
}
