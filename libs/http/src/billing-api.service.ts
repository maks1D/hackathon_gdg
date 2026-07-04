import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { Subscription, UsageRecord } from '@libs/shared';

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly apiService = inject(ApiService);

  getSubscriptions(): Observable<ApiResponse<Subscription[]>> {
    return this.apiService.get<Subscription[]>('/billing/subscriptions');
  }

  createSubscription(data: any): Observable<ApiResponse<Subscription>> {
    return this.apiService.post<Subscription>('/billing/subscriptions', data);
  }

  recordUsage(data: any): Observable<ApiResponse<UsageRecord>> {
    return this.apiService.post<UsageRecord>('/billing/usage', data);
  }
}
