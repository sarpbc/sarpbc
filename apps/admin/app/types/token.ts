export type PatToken = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type CreatePatTokenResponse = {
  id: string;
  name: string;
  createdAt: string;
  token: string;
};
