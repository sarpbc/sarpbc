export function canonicalImageContentType(contentType: string): string {
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  return normalized === "image/jpg" || normalized === "image/pjpeg" ? "image/jpeg" : normalized;
}
