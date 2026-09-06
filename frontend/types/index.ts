export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string | null;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type Announcement = {
  id: number;
  title: string;
  category: string;
  department: string;
  content: string;
  urgent: boolean;
  publishedAt: string;
};

export type EventItem = {
  id: number;
  title: string;
  description: string;
  department: string;
  venue: string;
  startAt: string;
  endAt: string;
};

export type CampusQuery = {
  id: number;
  name: string;
  email: string;
  department: string;
  subject: string;
  message: string;
  status: "PENDING" | "ANSWERED";
  adminResponse: string | null;
  createdAt: string;
  answeredAt: string | null;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  username: string;
  role: string;
};
