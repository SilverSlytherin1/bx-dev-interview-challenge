export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export class AuthService {
  private readonly baseUrl: string;
  private token: string | null = null;
  private user: User | null = null;
  private readonly TOKEN_KEY = 'bonusx_auth_token';
  private readonly USER_KEY = 'bonusx_user';

  constructor() {
    this.baseUrl = '';
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      this.token = localStorage.getItem(this.TOKEN_KEY);
      const userData = localStorage.getItem(this.USER_KEY);
      this.user = userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to load auth data from storage:', error);
      this.clearStorage();
    }
  }

  private saveToStorage(token: string, user: User): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save auth data to storage:', error);
    }
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token = null;
    this.user = null;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Login failed: ${error}`);
    }

    const authResponse: AuthResponse = await response.json();
    this.token = authResponse.accessToken;
    this.user = authResponse.user;
    this.saveToStorage(authResponse.accessToken, authResponse.user);

    return authResponse;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Registration failed: ${error}`);
    }

    const authResponse: AuthResponse = await response.json();
    this.token = authResponse.accessToken;
    this.user = authResponse.user;
    this.saveToStorage(authResponse.accessToken, authResponse.user);

    return authResponse;
  }

  logout(): void {
    this.clearStorage();
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }
}
