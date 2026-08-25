import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, setAuthToken, getStoredToken } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = getStoredToken();
    if (token) {
      setAuthToken(token);
      return { id: 0, email: "", created_at: "" };
    }
    return null;
  });
  const [loading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setAuthToken(res.access_token);
    setUser({ id: 0, email, created_at: "" });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await authApi.register(email, password);
    const res = await authApi.login(email, password);
    setAuthToken(res.access_token);
    setUser({ id: 0, email, created_at: "" });
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
