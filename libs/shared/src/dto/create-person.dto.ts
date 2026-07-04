export interface CreatePersonDto {
  email: string;
  name: string;
  role?: string;
  subscriptionTier?: string;
}

export interface UpdatePersonDto {
  email?: string;
  name?: string;
  role?: string;
  subscriptionTier?: string;
}
