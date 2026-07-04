export interface Person {
  id: string;
  email: string;
  name: string;
  role: PersonRole;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}

export enum PersonRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}
