export interface ForumPost {
  id: string;
  publicId: number;
  slug: string;
  title: string;
  content: string;
  topic: { id: string; title: string };
  author: string;
  createdAt: Date | string;
}
