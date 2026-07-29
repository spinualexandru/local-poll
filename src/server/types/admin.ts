export interface AdminUser {
  id: number;
  email: string;
  role: "admin";
}

export interface AdminOperationResult {
  success: boolean;
  user?: AdminUser;
  errors?: string[];
}
