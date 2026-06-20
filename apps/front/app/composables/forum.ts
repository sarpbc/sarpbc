import type { Post, PostPreview, PostShort, Topic } from "~/types/forum";

export async function getRecentForumActivities(): Promise<PostPreview[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ recentPosts: PostPreview[] }>(
      `${config.public.apiBase}/forum/preview`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    return res.recentPosts || [];
  } catch (error) {
    console.error("Error fetching recent forum activities:", error);
    return [];
  }
}

export async function getTopics(): Promise<Topic[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ topics: Topic[] }>(`${config.public.apiBase}/forum/topics`, {
      method: "GET",
      credentials: "include",
    });

    return res.topics || [];
  } catch (error) {
    console.error("Error fetching forum topics:", error);
    return [];
  }
}

export async function getPosts(): Promise<PostShort[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ posts: PostShort[] }>(`${config.public.apiBase}/posts`, {
      method: "GET",
      credentials: "include",
    });

    return res.posts || [];
  } catch (error) {
    console.error("Error fetching forum posts:", error);
    return [];
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ post: Post }>(`${config.public.apiBase}/posts/${id}`, {
      method: "GET",
      credentials: "include",
    });

    return res.post || null;
  } catch (error) {
    console.error("Error fetching forum post:", error);
    return null;
  }
}

export async function createForumPost(data: {
  title: string;
  content: string;
  topicId: string;
}): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ success?: boolean }>(`${config.public.apiBase}/posts`, {
      method: "POST",
      body: data,
      credentials: "include",
    });

    return res.success ?? false;
  } catch (error) {
    console.error("Error creating forum post:", error);
    return false;
  }
}

export async function createForumReply(data: {
  content: string;
  postId: string;
  replyToId?: string;
}): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ success?: boolean }>(`${config.public.apiBase}/replies`, {
      method: "POST",
      body: data,
      credentials: "include",
    });

    return res.success ?? false;
  } catch (error) {
    console.error("Error creating forum reply:", error);
    return false;
  }
}

export async function deleteForumPost(postId: string): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return true;
  } catch (error) {
    console.error("Error deleting forum post:", error);
    return false;
  }
}

export async function deleteForumReply(replyId: string): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/replies/${replyId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return true;
  } catch (error) {
    console.error("Error deleting forum reply:", error);
    return false;
  }
}
