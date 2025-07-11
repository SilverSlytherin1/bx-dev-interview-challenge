// JWT interfaces
export interface JwtPayload {
  sub: string;
  email: string;
}

// Re-export from types for backward compatibility
export type { UserRole, AuthProvider } from '../types/common.types';
