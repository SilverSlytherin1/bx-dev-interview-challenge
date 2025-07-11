import React, { createContext, useContext, useState, useCallback } from 'react';
import { AuthService } from '../services/auth.service';
import { User, LoginRequest, RegisterRequest, AuthContextType, AuthProviderProps } from '../models';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authService] = useState(() => new AuthService());
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setIsAuthenticated(true);
  }, [authService]);

  const register = useCallback(async (userData: RegisterRequest) => {
    const response = await authService.register(userData);
    setUser(response.user);
    setIsAuthenticated(true);
  }, [authService]);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, [authService]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    authService,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
