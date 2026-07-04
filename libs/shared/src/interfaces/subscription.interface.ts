export interface Subscription {
  id: string;
  personId: string;
  type: BusinessModel;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Business models as presented in workshop Day 1.
 * The architecture supports switching between these at runtime.
 */
export enum BusinessModel {
  SAAS = 'SAAS',
  FREEMIUM = 'FREEMIUM',
  PAY_PER_USE = 'PAY_PER_USE',
  LICENSE_B2B = 'LICENSE_B2B',
  WHITE_LABEL = 'WHITE_LABEL',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export interface UsageRecord {
  id: string;
  personId: string;
  action: string;
  units: number;
  cost: number;
  timestamp: Date;
}
