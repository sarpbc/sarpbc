/**
 * PandaScore: use `dark_mode_image_url` in dark mode when present, else `image_url`.
 */
export function resolveThemedLogoUrl(
  imageUrl: string | null | undefined,
  darkModeImageUrl: string | null | undefined,
  colorMode: string,
): string | undefined {
  const light = imageUrl?.trim() || undefined;
  const dark = darkModeImageUrl?.trim() || undefined;
  if (colorMode === "dark") {
    return dark ?? light;
  }
  return light;
}
