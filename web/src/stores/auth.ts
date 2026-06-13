import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null, // null on SSR — safe for hydration

  setAuth: (user, token) => {
    localStorage.setItem("access_token", token);
    set({ user, token });
  },

  setUser: (user) => set({ user }),

  clearAuth: () => {
    localStorage.removeItem("access_token");
    set({ user: null, token: null });
  },

  initAuth: () => {
    const token = localStorage.getItem("access_token");
    set({ token });
  },
}));
