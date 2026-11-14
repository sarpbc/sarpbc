import { auth, oauth2 } from "@googleapis/oauth2";
import type { oauth2_v2 } from "@googleapis/oauth2";
import { z } from "zod";
import { AuthenticationError } from "../../common/domain/errors/authentication-error";
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

type OAuth2Client = InstanceType<typeof auth.OAuth2>;

type Credentials = Parameters<OAuth2Client["setCredentials"]>[0];

/** One OAuth client with its own credentials, so overlapping callbacks never share state. */
export interface GoogleOAuthSession {
  getToken: (code: string) => Promise<{ tokens: Credentials }>;
  setCredentials: (tokens: Credentials) => void;
  generateAuthUrl: (options: Parameters<OAuth2Client["generateAuthUrl"]>[0]) => string;
  userinfo: () => Promise<oauth2_v2.Schema$Userinfo>;
}

export function createGoogleOAuthSession(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): GoogleOAuthSession {
  const client = new auth.OAuth2(clientId, clientSecret, redirectUri);

  return {
    getToken: async (code) => await client.getToken(code),
    setCredentials: (tokens) => {
      client.setCredentials(tokens);
    },
    generateAuthUrl: (options) => client.generateAuthUrl(options),
    userinfo: async () => {
      const { data } = await oauth2("v2").userinfo.get({ auth: client });

      return data;
    },
  };
}

export class GoogleIdentityGateway implements GoogleIdentity {
  constructor(private readonly newSession: () => GoogleOAuthSession) {}

  async profile(code: string): Promise<GoogleProfile> {
    const session = this.newSession();
    const { tokens } = await session.getToken(code);
    session.setCredentials(tokens);
    const parsed = profileSchema.safeParse(await session.userinfo());

    if (!parsed.success) {
      throw new AuthenticationError(
        "Google did not return a complete profile. Try again or use email and password.",
      );
    }

    return { ...parsed.data, picture: parsed.data.picture ?? null };
  }

  authorizationUrl(returnTo: OAuthReturnTo): string {
    return this.newSession().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["profile", "email"],
      state: returnTo,
    });
  }
}
