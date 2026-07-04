/**
 * Standard API response envelope.
 * All API endpoints return this structure for consistency.
 */
export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
  errors: ApiError[];
}

export interface ApiMeta {
  timestamp: string;
  path: string;
  /** Pagination info when applicable */
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}
