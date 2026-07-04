import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { Person, CreatePersonDto } from '@libs/shared';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly apiService = inject(ApiService);

  getUsers(page = 1, limit = 10): Observable<ApiResponse<Person[]>> {
    return this.apiService.get<Person[]>('/users', { page: String(page), limit: String(limit) });
  }

  createUser(data: CreatePersonDto): Observable<ApiResponse<Person>> {
    return this.apiService.post<Person>('/users', data);
  }
}
