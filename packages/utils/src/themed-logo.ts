import type { TeamLogos } from "@sarpbc/types";
import { isNonEmptyString } from "./text";

export type ThemedLogo = Partial<TeamLogos>;

function present(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();

  return isNonEmptyString(trimmed) ? trimmed : undefined;
}

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
