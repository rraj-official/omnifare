"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  isLoggedIn: boolean;
  user: { name: string; email: string; avatar: string } | null;
  login: () => void;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  loading: boolean;
  apiCallsMade: number;
  maxApiLimit: number;
  isUnlimited: boolean;
  incrementUsage: () => Promise<boolean>;
  showUsageLimitModal: boolean;
  setShowUsageLimitModal: (v: boolean) => void;
}

const UNLIMITED_EMAILS = ["rraj.official5@gmail.com"];

const AuthContext = createContext<AuthState | null>(null);

function avatarFromUser(u: User | null): string {
  if (!u) return "";
  const meta = u.user_metadata ?? {};
  const name: string = meta.full_name ?? meta.name ?? u.email ?? "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();
}

function nameFromUser(u: User | null): string {
  if (!u) return "";
  const meta = u.user_metadata ?? {};
  return meta.full_name ?? meta.name ?? u.email ?? "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const [apiCallsMade, setApiCallsMade] = useState(0);
  const [maxApiLimit, setMaxApiLimit] = useState(1000);

  const supabaseUser = session?.user ?? null;
  const email = supabaseUser?.email ?? "";
  const isUnlimited = UNLIMITED_EMAILS.includes(email);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) {
        setSession(s);
        setLoading(false);
        if (s) setShowAuthModal(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabaseUser) return;
    const supabase = getSupabase();
    supabase
      .from("profiles")
      .select("api_calls_made, max_api_limit")
      .eq("id", supabaseUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setApiCallsMade(data.api_calls_made ?? 0);
          setMaxApiLimit(data.max_api_limit ?? 1000);
        }
      });
  }, [supabaseUser]);

  const login = useCallback(() => {
    const supabase = getSupabase();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const incrementUsage = useCallback(async (): Promise<boolean> => {
    if (!supabaseUser) return false;
    if (isUnlimited) return true;

    if (apiCallsMade >= maxApiLimit) {
      setShowUsageLimitModal(true);
      return false;
    }

    const supabase = getSupabase();
    const newCount = apiCallsMade + 1;
    await supabase
      .from("profiles")
      .update({ api_calls_made: newCount })
      .eq("id", supabaseUser.id);

    setApiCallsMade(newCount);
    return true;
  }, [supabaseUser, isUnlimited, apiCallsMade, maxApiLimit]);

  const user = supabaseUser
    ? {
        name: nameFromUser(supabaseUser),
        email: supabaseUser.email ?? "",
        avatar: avatarFromUser(supabaseUser),
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!supabaseUser,
        user,
        login,
        logout,
        showAuthModal,
        setShowAuthModal,
        loading,
        apiCallsMade,
        maxApiLimit,
        isUnlimited,
        incrementUsage,
        showUsageLimitModal,
        setShowUsageLimitModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
