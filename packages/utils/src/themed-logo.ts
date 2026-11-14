import type { TeamLogos } from "@sarpbc/types";

export type ThemedLogo = Partial<TeamLogos>;

export function resolveThemedLogoUrl(
  logo: ThemedLogo | null | undefined,
  colorMode: string,
): string | undefined {
  const light = present(logo?.logoLightUrl);
  const dark = present(logo?.logoDarkUrl);
  const image = present(logo?.imageUrl);

  if (colorMode === "dark") {
    return dark ?? present(logo?.darkModeImageUrl) ?? light ?? image;
  }

  return light ?? image ?? dark;
}

function present(url: string | null | undefined): string | undefined {
  return url?.trim() || undefined;
}
