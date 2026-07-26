import { createFileRoute, Link, useNavigate, useSearch, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Zap, Mail, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { pickPrimaryRole, ROLE_LANDING, type AppRole } from "@/hooks/use-session";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Faith Automation ERP" },
      { name: "description", content: "Sign in to Faith Automation's AI-native manufacturing ERP." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      throw redirect({ to: search.redirect ?? "/" });
    }
  },
  component: AuthPage,
});

async function redirectAfterLogin(navigate: ReturnType<typeof useNavigate>, fallback: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) {
    navigate({ to: fallback as never });
    return;
  }
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
  const roles = ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
  const primary = pickPrimaryRole(roles);
  const dest = primary ? ROLE_LANDING[primary] : fallback;
  navigate({ to: (dest || "/") as never });
}

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siBusy, setSiBusy] = useState(false);

  const fallback = search.redirect ?? "/";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: siEmail.trim(),
      password: siPassword,
    });
    if (error) {
      toast.error(error.message);
      setSiBusy(false);
      return;
    }
    toast.success("Welcome back");
    await redirectAfterLogin(navigate, fallback);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-[oklch(0.28_0.08_255)] p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="surface-grid absolute inset-0 opacity-30" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground shadow-lg">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">Faith Automation</div>
            <div className="text-xs text-primary-foreground/70">BIW Manufacturing ERP</div>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            The AI-native command center for Body-in-White operations.
          </h1>
          <p className="text-primary-foreground/75">
            Projects, engineering, procurement, production, quality, and finance — unified in one
            enterprise workspace with an always-on AI assistant.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "12", l: "Active projects" },
              { k: "94.2%", l: "On-time delivery" },
              { k: "6.4x", l: "Inventory turns" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="font-display text-xl font-semibold">{s.k}</div>
                <div className="text-[11px] text-primary-foreground/70">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-primary-foreground/60">
          Built by ProBuddy Software · Single-tenant cloud
        </div>
      </aside>

      {/* Right form panel */}
      <section className="flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md border-border/60 shadow-elevated">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="font-display font-semibold">Faith Automation</div>
            </div>

            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Sign in to your workspace
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access the ERP.
            </p>

            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <FieldWithIcon icon={Mail}>
                <Label htmlFor="si-email">Email</Label>
                <Input
                  id="si-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={siEmail}
                  onChange={(e) => setSiEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </FieldWithIcon>
              <FieldWithIcon icon={Lock}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="si-password">Password</Label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="si-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={siPassword}
                  onChange={(e) => setSiPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </FieldWithIcon>
              <Button type="submit" className="w-full" disabled={siBusy}>
                {siBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function FieldWithIcon({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="relative [&_input]:pl-9">
        <Icon className="pointer-events-none absolute left-3 top-[calc(50%+8px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
