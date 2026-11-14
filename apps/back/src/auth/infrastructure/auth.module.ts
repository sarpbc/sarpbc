import { Global, Module } from "@nestjs/common";
import { AuthService } from "../application/auth.service";
import { UserModule } from "../../user/infrastructure/user.module";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { AuthController } from "./http/auth.controller";
import { ConfigService } from "@nestjs/config";
import { JwtTokenGateway } from "./jwt-token.gateway";
import { createGoogleOAuthSession, GoogleIdentityGateway } from "./google-identity.gateway";
import { UserService } from "../../user/application/user.service";

export const authServiceProvider = {
  provide: AuthService,
  useFactory: (config: ConfigService, jwt: JwtService, users: UserService) =>
    new AuthService(
      new JwtTokenGateway(jwt, config.getOrThrow<string>("jwt_token")),
      new GoogleIdentityGateway(() =>
        createGoogleOAuthSession(
          config.getOrThrow<string>("google_client_id"),
          config.getOrThrow<string>("google_client_secret"),
          config.getOrThrow<string>("google_redirect_uri"),
        ),
      ),
      users,
      {
        frontUrl: config.getOrThrow<string>("front_url"),
        adminUrl: config.getOrThrow<string>("admin_url"),
      },
    ),
  inject: [ConfigService, JwtService, UserService],
};

@Global()
@Module({
  imports: [UserModule, JwtModule.register({})],
  providers: [authServiceProvider],
  controllers: [AuthController],
  exports: [AuthService, UserModule],
})
export class AuthModule {}
