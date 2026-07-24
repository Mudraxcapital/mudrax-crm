export interface UserLookupSummary {
  id: string;
  organizationId: string;
  status: string;
  fullName: string;
  email: string | null;
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserLookupSummary | null>;
}
