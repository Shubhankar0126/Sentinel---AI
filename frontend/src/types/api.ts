export interface PaginationMeta {
  total: number;
  skip: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationMeta | null;
  errors: string[];
  timestamp: string;
}

export interface ApiListResult<T> {
  items: T[];
  pagination?: PaginationMeta | null;
}

export interface HealthPayload {
  application: string;
  database: string;
  datasets: Record<string, Record<string, unknown>>;
  version: string;
  uptime_seconds: number;
  environment: string;
}

