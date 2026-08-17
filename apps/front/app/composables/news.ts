export type NewsArticleListItem = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  imageUrl: string | null;
  /** Plain-text teaser from list endpoints; omitted on full article payloads. */
  excerpt?: string;
  commentCount?: number;
};

export type NewsArticle = NewsArticleListItem & {
  author: string;
  content: string;
  isDraft: boolean;
};

export type PaginatedNewsArticles = {
  data: NewsArticleListItem[];
  total: number;
  page: number;
  limit: number;
};

export async function createNewsArticle(body: {
  title: string;
  content: string;
  slug?: string;
  imageUrl?: string;
}): Promise<NewsArticle | null> {
  const config = useRuntimeConfig();
  try {
    return await $fetch<NewsArticle>(`${config.public.apiBase}/news`, {
      method: "POST",
      body,
      credentials: "include",
    });
  } catch (error) {
    console.error("Error creating news article:", error);
    return null;
  }
}

export async function getNewsArticles(
  page = 0,
  limit = 10,
  locale?: string,
): Promise<PaginatedNewsArticles> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<PaginatedNewsArticles>(`${config.public.apiBase}/news`, {
      method: "GET",
      credentials: "include",
      query: { page, limit, locale },
    });

    return res;
  } catch (error) {
    console.error("Error fetching news articles:", error);
    return { data: [], total: 0, page, limit };
  }
}

export async function getNewsArticlesAdmin(page = 0, limit = 10): Promise<PaginatedNewsArticles> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<PaginatedNewsArticles>(`${config.public.apiBase}/news/admin`, {
      method: "GET",
      credentials: "include",
      query: { page, limit },
    });

    return res;
  } catch (error) {
    console.error("Error fetching all news articles (admin):", error);
    return { data: [], total: 0, page, limit };
  }
}

export async function getNewsArticle(slug: string, locale?: string): Promise<NewsArticle | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<NewsArticle>(`${config.public.apiBase}/news/${slug}`, {
      method: "GET",
      credentials: "include",
      query: { locale },
    });

    return res;
  } catch (error) {
    console.error("Error fetching news article:", error);
    return null;
  }
}

export async function getNewsArticleAdmin(slug: string): Promise<NewsArticle | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<NewsArticle>(`${config.public.apiBase}/news/admin/${slug}`, {
      method: "GET",
      credentials: "include",
    });

    return res;
  } catch (error) {
    console.error("Error fetching news article:", error);
    return null;
  }
}

export async function editNewsArticle(
  slug: string,
  body: {
    title: string;
    content: string;
    slug?: string;
  },
): Promise<NewsArticle | null> {
  const config = useRuntimeConfig();
  try {
    return await $fetch<NewsArticle>(`${config.public.apiBase}/news/${slug}`, {
      method: "PATCH",
      body,
      credentials: "include",
    });
  } catch (error) {
    console.error("Error editing news article:", error);
    return null;
  }
}

export async function publishNewsArticle(slug: string): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/news/${slug}/publish`, {
      method: "PATCH",
      credentials: "include",
      body: {},
    });

    return true;
  } catch (error) {
    console.error("Error publishing news article:", error);
    return false;
  }
}

export async function unpublishNewsArticle(slug: string): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/news/${slug}/unpublish`, {
      method: "PATCH",
      credentials: "include",
      body: {},
    });

    return true;
  } catch (error) {
    console.error("Error unpublishing news article:", error);
    return false;
  }
}
