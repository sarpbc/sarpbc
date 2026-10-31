export interface ThemedLogo {
  imageUrl?: string | null;
  darkModeImageUrl?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
}

export function resolveThemedLogoUrl(
  logo: ThemedLogo | null | undefined,
  colorMode: string,
): string | undefined {
  const light = present(logo?.logoLightUrl);
  const dark = present(logo?.logoDarkUrl);
  const image = present(logo?.imageUrl);
  if (colorMode === "dark") {
    return dark ?? light ?? present(logo?.darkModeImageUrl) ?? image;
  }
  return light ?? dark ?? image;
}

function present(url: string | null | undefined): string | undefined {
  return url?.trim() || undefined;
}
