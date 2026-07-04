import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { LlmCompletionRequest, LlmCompletionResponse } from '@libs/shared';

@Injectable({ providedIn: 'root' })
export class LlmApiService {
  private readonly apiService = inject(ApiService);

  complete(request: LlmCompletionRequest): Observable<ApiResponse<LlmCompletionResponse>> {
    return this.apiService.post<LlmCompletionResponse>('/llm/complete', request);
  }

  getMetrics(): Observable<ApiResponse<any>> {
    return this.apiService.get<any>('/llm/metrics');
  }
}
