export function homepageNewsHeadingLevel(
  articleId: string,
  featuredArticleId: string | null,
): "h1" | "h2" {
  return articleId === featuredArticleId ? "h1" : "h2";
}
