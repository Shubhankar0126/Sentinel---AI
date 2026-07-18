import type { UserRole, UserRead } from "@/types/domain";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
  role?: UserRole;
  plant_id?: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: UserRead;
  tokens: TokenPair;
}

export interface RefreshTokenResponse extends TokenPair {}

