import type { TeamLogos } from "@sarpbc/types";
import { isNonEmptyString } from "./text";

export type ThemedLogo = Partial<TeamLogos>;

const present = (url: string | null | undefined) => {
  const trimmed = url?.trim();

  return isNonEmptyString(trimmed) ? trimmed : undefined;
};

export const resolveThemedLogoUrl = (logo: ThemedLogo | null | undefined, colorMode: string) => {
  const light = present(logo?.logoLightUrl);
  const dark = present(logo?.logoDarkUrl);
  const image = present(logo?.imageUrl);

  if (colorMode === "dark") {
    return dark ?? present(logo?.darkModeImageUrl) ?? light ?? image;
  }

  return light ?? image ?? dark;
};
