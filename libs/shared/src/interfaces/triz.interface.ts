export interface KpiDto {
  name: string;
  weight: number;
}

export interface TrizProject {
  id: string;
  title: string;
  description: string;
  targetSdgs: string;
  constraints?: string;
  kpis?: string;
  status: string;
}

export interface ContradictionResult {
  improvingIds: number[];
  improvingNames: string[];
  worseningIds: number[];
  worseningNames: string[];
  ifThenButText: string;
}

export interface PrincipleFrequency {
  principleId: number;
  name: string;
  description: string;
  frequency: number;
}

export interface SampledTriplet {
  index: number;
  principleIds: number[];
  principleNames: string[];
}

export interface TrizCandidate {
  id: string;
  title: string;
  description: string;
  appliedRules: string;
  source?: 'TRIZ' | 'MORPHOLOGICAL';
  isDisqualified?: boolean;
  disqualReason?: string;
}

export interface ScoreboardEntry {
  candidateId: string;
  title: string;
  isDisqualified?: boolean;
  disqualReason?: string;
  scores: Record<string, number>;
  weightedScore: number;
}

export interface SelectionResult {
  winner: TrizCandidate;
  reasoning: string;
}

export interface CreateProjectDto {
  title: string;
  description: string;
  targetSdgs: number[];
}
