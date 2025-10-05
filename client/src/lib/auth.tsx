import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';
import { User } from '@/types';
import { STORAGE_KEYS, API_ENDPOINTS } from './constants';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  );
  
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [API_ENDPOINTS.AUTH.ME],
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest('POST', API_ENDPOINTS.AUTH.LOGIN, { email, password });
      return response.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
      queryClient.setQueryData([API_ENDPOINTS.AUTH.ME], data.user);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      const response = await apiRequest('POST', API_ENDPOINTS.AUTH.REGISTER, { email, password, name });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.token) {
        setToken(data.token);
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        queryClient.setQueryData([API_ENDPOINTS.AUTH.ME], data.user);
      }
    },
  });

  const logout = () => {
    setToken(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    queryClient.clear();
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  // Update axios headers when token changes
  useEffect(() => {
    if (token) {
      // The queryClient will automatically include the token in requests
      // This is handled by the default queryFn in queryClient.ts
    }
  }, [token]);

  const value: AuthContextType = {
    user: user || null,
    token,
    login: async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    register: async (email: string, password: string, name: string) => {
      await registerMutation.mutateAsync({ email, password, name });
    },
    logout,
    isLoading: userLoading || loginMutation.isPending || registerMutation.isPending,
    isAuthenticated: !!user && !!token,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Higher-order component for protecting routes
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  requiredRoles?: string[]
) {
  return function AuthenticatedComponent(props: T) {
    const { isAuthenticated, hasAnyRole, user } = useAuth();

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
            <p className="text-muted-foreground">이 페이지에 접근하려면 로그인하세요.</p>
          </div>
        </div>
      );
    }

    if (requiredRoles && !hasAnyRole(requiredRoles)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">권한 없음</h1>
            <p className="text-muted-foreground">이 페이지에 접근할 권한이 없습니다.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
