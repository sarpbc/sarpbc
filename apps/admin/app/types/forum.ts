export interface PostShort {
  id: string;
  title: string;
  author: string;
  createdAt: Date;
  topic?: {
    id: string;
    title: string;
  };
}

export interface Reply {
  id: string;
  content: string;
  author: { id: string; userName: string };
  createdAt: Date;
  replies: Reply[];
}
