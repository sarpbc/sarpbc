import {
  getDatabasePassword,
  getFrontUrl,
  getAdminUrl,
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleRedirectUri,
  getJwtToken,
  getPandaScoreApiToken,
  getCloudflareAccountId,
  getCloudflareApiToken,
  getCloudflareAccountHash,
} from "src/common/envirronement/secrets";

export default () => ({
  databasePassword: getDatabasePassword(),
  jwt_token: getJwtToken(),
  google_client_secret: getGoogleClientSecret(),
  google_client_id: getGoogleClientId(),
  google_redirect_uri: getGoogleRedirectUri(),
  front_url: getFrontUrl(),
  admin_url: getAdminUrl(),
  pandascore_api_token: getPandaScoreApiToken(),
  pandascore_sync_on_boot: process.env.PANDASCORE_SYNC_ON_BOOT === "true",
  production: process.env.NODE_ENV === "production",
  cloudflare_account_id: getCloudflareAccountId(),
  cloudflare_api_token: getCloudflareApiToken(),
  cloudflare_account_hash: getCloudflareAccountHash(),
});
