import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    path: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  errors: Array<{ code: string; message: string }>;
}

/**
 * Generic API service for typed HTTP calls.
 * Use this instead of raw HttpClient for consistent response handling.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'https://hackathon-api-v5un4f6xta-lm.a.run.app/api';
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: Record<string, string>): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params });
  }

  post<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body);
  }

  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`);
  }
}
