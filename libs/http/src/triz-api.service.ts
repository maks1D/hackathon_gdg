import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { 
  TrizProject, 
  ContradictionResult, 
  PrincipleFrequency, 
  SampledTriplet, 
  TrizCandidate, 
  ScoreboardEntry, 
  SelectionResult 
} from '@libs/shared';

@Injectable({ providedIn: 'root' })
export class TrizApiService {
  private readonly apiService = inject(ApiService);

  createProject(title: string, description: string, targetSdgs: number[]): Observable<ApiResponse<TrizProject>> {
    return this.apiService.post<TrizProject>('/triz/project', { title, description, targetSdgs });
  }

  generateContradiction(projectId: string): Observable<ApiResponse<ContradictionResult>> {
    return this.apiService.post<ContradictionResult>(`/triz/project/${projectId}/contradiction`, {});
  }

  confirmContradiction(projectId: string): Observable<ApiResponse<{ frequencies: PrincipleFrequency[]; triplets: SampledTriplet[] }>> {
    return this.apiService.post<{ frequencies: PrincipleFrequency[]; triplets: SampledTriplet[] }>(`/triz/project/${projectId}/contradiction/confirm`, {});
  }

  generateCandidates(projectId: string): Observable<ApiResponse<{
    trizCandidates: TrizCandidate[];
    morphologicalCandidates: TrizCandidate[];
  }>> {
    return this.apiService.post<{
      trizCandidates: TrizCandidate[];
      morphologicalCandidates: TrizCandidate[];
    }>(`/triz/project/${projectId}/candidates/generate`, {});
  }

  evaluateCandidates(projectId: string): Observable<ApiResponse<{ scoreboard: ScoreboardEntry[] }>> {
    return this.apiService.post<{ scoreboard: ScoreboardEntry[] }>(`/triz/project/${projectId}/evaluate`, {});
  }

  selectWinner(projectId: string): Observable<ApiResponse<SelectionResult>> {
    return this.apiService.post<SelectionResult>(`/triz/project/${projectId}/select`, {});
  }
}
