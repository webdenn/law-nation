export interface ToggleVisibilityData {
  isVisible: boolean;
}

export interface VisibilityStats {
  totalPublished: number;
  visibleToUsers: number;
  hiddenFromUsers: number;
}

export interface HiddenArticle {
  id: string;
  title: string;
  authorName: string;
  category: string;
  hiddenAt: Date | null;
  hiddenBy: string | null;
  createdAt: Date;
}

export interface HiddenArticlesResponse {
  articles: HiddenArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ToggleVisibilityResponse {
  success: boolean;
  message: string;
  article: {
    id: string;
    title: string;
    isVisible: boolean;
    hiddenAt: Date | null;
    hiddenBy: string | null;
    status: string;
  };
}