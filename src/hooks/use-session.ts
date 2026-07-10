import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole =
  | "admin"
  | "sales"
  | "projects"
  | "engineering"
  | "purchase"
  | "stores"
  | "production"
  | "quality"
  | "finance"
  | "hr"
  | "executives";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface UseSessionState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

// Priority for choosing the "primary" landing role.
const ROLE_PRIORITY: AppRole[] = [
  "admin",
  "executives",
  "projects",
  "sales",
  "engineering",
  "production",
  "quality",
  "purchase",
  "stores",
  "finance",
  "hr",
];

export function pickPrimaryRole(roles: AppRole[]): AppRole | null {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return roles[0] ?? null;
}

export const ROLE_LANDING: Record<AppRole, string> = {
  admin: "/administration",
  executives: "/",
  projects: "/projects",
  sales: "/crm",
  engineering: "/engineering",
  production: "/manufacturing",
  quality: "/quality",
  purchase: "/procurement",
  stores: "/inventory",
  finance: "/finance",
  hr: "/hr",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  executives: "Executive",
  projects: "Projects",
  sales: "Sales",
  engineering: "Engineering",
  production: "Production",
  quality: "Quality",
  purchase: "Purchase",
  stores: "Stores",
  finance: "Finance",
  hr: "Human Resources",
};

export function useSession(): UseSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      load(data.session?.user.id).finally(() => mounted && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Defer profile fetch to avoid deadlocks inside the callback
      setTimeout(() => load(s?.user.id), 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    profile,
    roles,
    primaryRole: pickPrimaryRole(roles),
    loading,
    refresh: async () => load(session?.user.id),
  };
}
