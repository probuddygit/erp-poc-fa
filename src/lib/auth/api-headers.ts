import { supabase } from "@/integrations/supabase/client";

/** JSON headers plus the signed-in user's bearer token for internal API routes. */
export async function apiHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
