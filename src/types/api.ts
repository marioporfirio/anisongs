export interface ApiResponse<T> {
  data: T;
  error: null | {
    message: string;
  };
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}