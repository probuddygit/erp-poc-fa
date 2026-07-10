import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession, ROLE_LABELS } from "@/hooks/use-session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · Faith Automation ERP" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, roles, primaryRole, loading, refresh } = useSession();
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setDepartment(profile.department ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  const initials =
    (fullName || user?.email || "U")
      .split(/\s+|@/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        department: department.trim() || null,
        phone: phone.trim() || null,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    refresh();
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information and how you appear across the ERP.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your identity in Faith Automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-semibold">{fullName || user?.email}</div>
                <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Primary role</span>
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {primaryRole ? ROLE_LABELS[primaryRole] : "—"}
                </Badge>
              </div>
              <div>
                <div className="mb-1.5 text-muted-foreground">Assigned roles</div>
                <div className="flex flex-wrap gap-1.5">
                  {roles.length ? (
                    roles.map((r) => (
                      <Badge key={r} variant="outline">
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {user?.id?.slice(0, 8)}…
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Displayed on approvals, comments and activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pf-name">Full name</Label>
                  <Input
                    id="pf-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={100}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-email">Email</Label>
                  <Input id="pf-email" value={user?.email ?? ""} disabled readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-dept">Department</Label>
                  <Input
                    id="pf-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-phone">Phone</Label>
                  <Input
                    id="pf-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 …"
                    maxLength={30}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
