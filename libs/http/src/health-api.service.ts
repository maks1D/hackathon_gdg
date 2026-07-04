import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private readonly apiService = inject(ApiService);

  getHealth(): Observable<ApiResponse<any>> {
    return this.apiService.get<any>('/health');
  }

  getHealthLive(): Observable<ApiResponse<any>> {
    return this.apiService.get<any>('/health/live');
  }

  getHealthReady(): Observable<ApiResponse<any>> {
    return this.apiService.get<any>('/health/ready');
  }
}
