export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  author: string;
  content: string;
  createdAt: string;
  isDraft: boolean;
  imageUrl?: string | null;
  titleFr?: string | null;
  contentFr?: string | null;
};

export type PaginatedNewsArticles = {
  data: NewsArticle[];
  total: number;
  page: number;
  limit: number;
};

export async function createNewsArticle(body: {
  title: string;
  content: string;
  slug?: string;
  imageUrl?: string;
  titleFr?: string | null;
  contentFr?: string | null;
}): Promise<NewsArticle | null> {
  try {
    return await apiFetch<NewsArticle>("/news", {
      method: "POST",
      body,
    });
  } catch (error) {
    console.error("Error creating news article:", error);
    return null;
  }
}

export async function getNewsArticlesAdmin(page = 0, limit = 10): Promise<PaginatedNewsArticles> {
  try {
    return await apiFetch<PaginatedNewsArticles>("/news/admin", {
      method: "GET",
      query: { page, limit },
    });
  } catch (error) {
    console.error("Error fetching all news articles (admin):", error);
    return { data: [], total: 0, page, limit };
  }
}

export async function getNewsArticleAdmin(slug: string): Promise<NewsArticle | null> {
  try {
    return await apiFetch<NewsArticle>(`/news/admin/${slug}`, {
      method: "GET",
    });
  } catch (error) {
    console.error("Error fetching news article:", error);
    return null;
  }
}

export async function editNewsArticle(
  slug: string,
  body: {
    title?: string;
    content?: string;
    slug?: string;
    imageUrl?: string | null;
    titleFr?: string | null;
    contentFr?: string | null;
  },
): Promise<NewsArticle | null> {
  try {
    return await apiFetch<NewsArticle>(`/news/${slug}`, {
      method: "PATCH",
      body,
    });
  } catch (error) {
    console.error("Error editing news article:", error);
    return null;
  }
}

export async function publishNewsArticle(slug: string): Promise<boolean> {
  try {
    await apiFetch(`/news/${slug}/publish`, {
      method: "PATCH",
    });
    return true;
  } catch (error) {
    console.error("Error publishing news article:", error);
    return false;
  }
}

export async function unpublishNewsArticle(slug: string): Promise<boolean> {
  try {
    await apiFetch(`/news/${slug}/unpublish`, {
      method: "PATCH",
    });
    return true;
  } catch (error) {
    console.error("Error unpublishing news article:", error);
    return false;
  }
}

export async function deleteNewsArticle(slug: string): Promise<boolean> {
  try {
    await apiFetch(`/news/${slug}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting news article:", error);
    return false;
  }
}
