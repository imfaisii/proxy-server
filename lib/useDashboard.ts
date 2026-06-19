"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardState } from "@/lib/types";

const POLL_MS = 2500;

export interface UseDashboard {
  authed: boolean;
  state: DashboardState | null;
  loading: boolean;
  error: boolean;
  loginError: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDashboard(): UseDashboard {
  const [authed, setAuthed] = useState(false);
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.status === 401) {
        setAuthed(false);
        setState(null);
        return;
      }
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as DashboardState;
      setState(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // Initial session check.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const data = (await res.json()) as { authed: boolean };
        if (!cancelled) setAuthed(Boolean(data.authed));
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll /api/state while authed. (state is cleared by logout / a 401, not here,
  // to avoid a synchronous setState in the effect body.)
  useEffect(() => {
    if (!authed) return;
    // fetchState is async: its setState calls run in the resolved promise, not
    // synchronously in the effect body (the lint rule can't see through useCallback).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchState();
    const iv = setInterval(fetchState, POLL_MS);
    return () => clearInterval(iv);
  }, [authed, fetchState]);

  const login = useCallback(
    async (password: string) => {
      setLoginError(false);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (res.ok) {
          setAuthed(true);
          await fetchState();
        } else {
          setLoginError(true);
        }
      } catch {
        setLoginError(true);
      }
    },
    [fetchState],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore network errors on logout */
    }
    setAuthed(false);
    setState(null);
    setLoginError(false);
  }, []);

  return { authed, state, loading, error, loginError, login, logout, refresh: fetchState };
}
