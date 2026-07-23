/**
 * Temporary cutover redirect: legacy /dashboard paths → apps/admin.
 * Maps /dashboard/foo → {adminUrl}/foo and /fr/dashboard/foo → {adminUrl}/fr/foo.
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;

  let rest: string | null = null;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    rest = pathname.slice("/dashboard".length) || "/";
  } else if (pathname === "/fr/dashboard" || pathname.startsWith("/fr/dashboard/")) {
    const suffix = pathname.slice("/fr/dashboard".length);
    rest = `/fr${suffix}`;
  }

  if (rest === null) {
    return;
  }

  const config = useRuntimeConfig();
  const adminBase = String(config.public.adminUrl || "https://admin.sarpbc.org").replace(/\/$/, "");
  const target = new URL(rest.startsWith("/") ? rest : `/${rest}`, `${adminBase}/`);
  target.search = url.search;

  return sendRedirect(event, target.toString(), 302);
});
