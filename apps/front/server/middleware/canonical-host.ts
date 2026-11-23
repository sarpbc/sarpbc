import { SITE_ORIGIN } from "@sarpbc/ui/config";

const WWW_HOST = `www.${new URL(SITE_ORIGIN).host}`;

export default defineEventHandler(async (event) => {
  if (getRequestHost(event) === WWW_HOST) {
    await sendRedirect(event, `${SITE_ORIGIN}${event.path}`, 301);
  }
});
