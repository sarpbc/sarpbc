export interface User {
  id: string;

  admin?: boolean;

  email: string;

  userName: string;

  avatarUrl: string | null;
}
