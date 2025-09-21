export interface User {
  id: number;
  email: string;
  nome: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface VerifyResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface TimeEntry {
  id: string;
  date: string;
  time: string;
  type: 'entrada' | 'saida';
  timestamp: string;
}