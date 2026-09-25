import { createFileRoute, Link, useNavigate, useSearch, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail, Lock } from "lucide-react";

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
      { title: "Sign in · YUFLO" },
      { name: "description", content: "Sign in to YUFLO." },
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
      <aside className="relative hidden overflow-hidden bg-[oklch(0.17_0.014_262)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.56_0.16_252/0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.74_0.12_230/0.18),transparent_50%)]" />
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="relative flex items-center">
          <img src="/yuflo-logo-light.png" alt="YUFLO" className="h-12 w-auto" />
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            The AI-native command center for growing businesses.
          </h1>
          <p className="text-white/75">
            Sales, projects, procurement, inventory, operations, and finance — unified in one
            intelligent workspace with an always-on AI assistant.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "12", l: "Active projects" },
              { k: "94.2%", l: "On-time delivery" },
              { k: "6.4x", l: "Inventory turns" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="font-display text-xl font-semibold">{s.k}</div>
                <div className="text-[11px] text-white/70">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/60">
          Built by ProBuddy Software · Single-tenant cloud
        </div>
      </aside>

      {/* Right form panel */}
      <section className="theme-light flex items-center justify-center bg-gradient-to-br from-[oklch(0.985_0.004_247)] via-[oklch(0.965_0.008_250)] to-[oklch(0.93_0.02_250)] p-4 text-foreground sm:p-8">
        <Card className="w-full max-w-md overflow-hidden border-border/60 shadow-elevated">
          {/* Card header band */}
          <div className="relative border-b border-border/60 bg-gradient-to-br from-[oklch(0.94_0.035_245)] via-[oklch(0.97_0.015_245)] to-white px-6 pb-5 pt-7 sm:px-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-[#38BDF8]" />
            <div className="mb-4 flex items-center lg:hidden">
              <img src="/yuflo-logo.png" alt="YUFLO" className="h-10 w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <img
                src="/yuflo-icon.png"
                alt=""
                className="hidden h-14 w-14 shrink-0 rounded-full shadow-sm ring-4 ring-white lg:block"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Welcome back</p>
                <h2 className="font-display text-xl sm:text-[22px] leading-tight font-semibold tracking-tight">
                  Sign in to YUFLO
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use your work email to continue.
                </p>
              </div>
            </div>
          </div>

          <CardContent className="bg-[oklch(0.975_0.007_250)] p-6 sm:p-8">
            <form onSubmit={handleSignIn} className="space-y-4">
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
              <Button type="submit" className="h-11 w-full text-[15px] font-semibold shadow-sm" disabled={siBusy}>
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
      <div className="relative [&_input]:h-11 [&_input]:border-[oklch(0.89_0.012_255)] [&_input]:bg-white [&_input]:pl-9 [&_input]:shadow-[0_1px_2px_oklch(0.21_0.03_264/0.06)] [&_input:focus-visible]:border-primary [&_input:focus-visible]:ring-4 [&_input:focus-visible]:ring-primary/15 [&_input:-webkit-autofill]:shadow-[inset_0_0_0_1000px_white]">
        <Icon className="pointer-events-none absolute left-3 top-[calc(50%+10px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
