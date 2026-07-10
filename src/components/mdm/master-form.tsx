import { useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mdmStore } from "@/lib/mdm/store";
import { useSession } from "@/hooks/use-session";
import type { FieldDef, MasterDef, MasterRecord } from "@/lib/mdm/types";
import { FieldRenderer } from "./field-renderer";

interface MasterFormProps {
  def: MasterDef;
  record?: MasterRecord;
  mode: "create" | "edit";
}

export function MasterForm({ def, record, mode }: MasterFormProps) {
  const navigate = useNavigate();
  const { user } = useSession();
  const [busy, setBusy] = useState<null | "save" | "submit">(null);

  const initialData = useMemo(() => {
    const seed: Record<string, unknown> = { ...(record?.data ?? {}) };
    for (const f of def.fields) {
      if (seed[f.key] === undefined && f.defaultValue !== undefined) {
        seed[f.key] = f.defaultValue;
      }
    }
    return seed;
  }, [def, record]);

  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const groups = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    for (const f of def.fields) {
      const g = f.group ?? "General";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return Array.from(map.entries());
  }, [def]);

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const f of def.fields) {
      if (f.required) {
        const v = data[f.key];
        if (v === undefined || v === null || v === "") {
          errs[f.key] = `${f.label} is required`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const persist = (submit: boolean) => {
    if (!validate()) {
      toast.error("Please fix required fields");
      return;
    }
    setBusy(submit ? "submit" : "save");
    const actor = user?.email ?? "system";
    const saved =
      mode === "create"
        ? mdmStore.create(def, data, actor)
        : mdmStore.update(def, record!.id, data, actor);
    if (submit && saved && def.requiresApproval) {
      mdmStore.submitForApproval(def, saved.id, actor);
    }
    setBusy(null);
    toast.success(
      submit
        ? `${def.name} submitted for approval`
        : mode === "create"
          ? `${def.name} created`
          : `${def.name} saved`,
    );
    if (saved) {
      navigate({ to: "/masters/$master/$id", params: { master: def.key, id: saved.id } });
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/masters/$master" params={{ master: def.key }}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              {mode === "create" ? `New ${def.name}` : `Edit ${record?.code}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {def.pluralName} · {def.fields.length} fields ·
              {def.requiresApproval ? " approval required" : " no approval"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => persist(false)} disabled={busy !== null} className="gap-2">
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          {def.requiresApproval && (
            <Button size="sm" onClick={() => persist(true)} disabled={busy !== null} className="gap-2">
              {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Save & submit
            </Button>
          )}
        </div>
      </header>

      {groups.map(([groupName, fields]) => (
        <Card key={groupName} className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {groupName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : undefined}>
                  <FieldRenderer
                    field={f}
                    value={data[f.key]}
                    onChange={(v) => setData((prev) => ({ ...prev, [f.key]: v }))}
                  />
                  {errors[f.key] && (
                    <p className="mt-1 text-[11px] font-medium text-destructive">{errors[f.key]}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
