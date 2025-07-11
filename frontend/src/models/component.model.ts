import { User, LoginRequest, RegisterRequest } from './auth.model';
import { AuthService } from '../services/auth.service';
import { FileService } from '../services/file.service';

// Component-specific interfaces
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  authService: AuthService;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

export interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface FileUploadProps {
  fileService: FileService;
  disabled?: boolean;
}
