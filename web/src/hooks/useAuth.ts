"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me").then((r) => r.data),
    enabled: !!token,
    retry: false,
  });
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      api.post("/auth/login", payload).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token);
      qc.setQueryData(["me"], data.user);
      router.push("/tasks");
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      api.post("/auth/register", payload).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token);
      qc.setQueryData(["me"], data.user);
      router.push("/tasks");
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return () => {
    clearAuth();
    qc.clear();
    router.push("/login");
  };
}
