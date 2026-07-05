export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  pictureUrl: string | null;
  createdAt: string; // ISO-8601
}
