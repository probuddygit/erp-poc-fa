import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CheckCircle2, Download, Eye, Plus, Search, XCircle, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCsv } from "@/lib/crud";
import { useCrud, RowActions } from "@/components/crud-kit";
import { useQualityDoc } from "@/components/quality-doc-dialog";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";
import { AiCopilotPanel, AiMetricStrip, type AiAction } from "@/components/ai/module-copilot";
import { useHR } from "@/lib/hr/store";
import { useWorkforce, wfUpsert, wfDelete, wfSetStatus, advanceCandidate, approveTravel } from "@/lib/workforce/store";
import { WORKFORCE_SCHEMAS } from "@/lib/workforce/schemas";
import { useWorkforceOptions } from "@/lib/workforce/options";
import { workforceDocument } from "@/lib/workforce/documents";
import { WORKFORCE_SECTIONS, type ColDef, type CopilotKey, type TabDef } from "@/lib/workforce/registry";
import {
  recruitmentActions,
  performanceActions,
  learningActions,
  adminActions,
  safetyActions,
  complianceActions,
} from "@/lib/workforce/intelligence";
import type { WFRecord, WorkforceState } from "@/lib/workforce/types";
import type { HRState } from "@/lib/hr/types";

function useCopilot(key: CopilotKey | undefined, w: WorkforceState, hr: HRState): AiAction[] {
  return useMemo(() => {
    switch (key) {
      case "recruitment": return recruitmentActions(w);
      case "performance": return performanceActions(w, hr);
      case "learning": return learningActions(w);
      case "admin": return adminActions(w);
      case "safety": return safetyActions(w);
      case "compliance": return complianceActions(w);
      default: return [];
    }
  }, [key, w, hr]);
}

/** Metadata-driven list surface used by every Workforce & Administration sub-module. */
export function WorkforceDataSection({ sectionKey }: { sectionKey: string }) {
  const def = WORKFORCE_SECTIONS[sectionKey];
  const w = useWorkforce((s) => s);
  const hr = useHR((s) => s);
  const options = useWorkforceOptions();
  const crud = useCrud(WORKFORCE_SCHEMAS, wfUpsert, wfDelete, options);
  const docs = useQualityDoc();
  const [tabKey, setTabKey] = useState(def?.tabs[0]?.key ?? "");
  const [q, setQ] = useState("");
  const actions = useCopilot(def?.copilot, w, hr);

  const tab: TabDef | undefined = def?.tabs.find((t) => t.key === tabKey) ?? def?.tabs[0];
  const rows = useMemo(() => {
    const list = (tab ? w[tab.key] : []) ?? [];
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }, [w, tab, q]);

  if (!def || !tab) return <div className="p-8 text-sm text-muted-foreground">Unknown section.</div>;

  const nameOf = (id: unknown) => hr.employees.find((e) => e.id === id)?.name ?? String(id ?? "—");
  const resolve = (key: string, value: unknown) => (key === "empId" ? nameOf(value) : value === undefined || value === "" ? "—" : String(value));

  const money = tab.cols.find((c) => c.kind === "money");
  const totalValue = money ? rows.reduce((a, r) => a + Number(r[money.key] ?? 0), 0) : 0;
  const pending = rows.filter((r) => ["pending", "draft", "open", "in-progress", "hold", "requested", "overdue"].includes(String(r.status ?? ""))).length;

  const metrics = [
    { label: "Records", value: String(rows.length), sub: tab.label },
    { label: "Open / Pending", value: String(pending), warn: pending > 0 },
    ...(money ? [{ label: `Total ${money.label}`, value: fmtCompact(totalValue) }] : []),
    { label: "AI Insights", value: String(actions.length), sub: def.copilotTitle ?? "Copilot" },
  ];

  const cell = (r: WFRecord, c: ColDef) => {
    const v = r[c.key];
    switch (c.kind) {
      case "code": return <span className="font-mono text-xs">{String(v ?? "—")}</span>;
      case "status": return v ? <StatusPill status={String(v)} /> : <span className="text-muted-foreground">—</span>;
      case "badge": return v ? <Badge variant="outline" className="capitalize">{String(v)}</Badge> : <span className="text-muted-foreground">—</span>;
      case "money": return <span className="font-mono text-xs">{fmtCompact(Number(v ?? 0))}</span>;
      case "num": return <span className="font-mono text-xs">{v === undefined || v === "" ? "—" : String(v)}</span>;
      case "date": return <span className="text-muted-foreground">{v ? shortDate(String(v)) : "—"}</span>;
      case "emp": return <span className="font-medium">{nameOf(v)}</span>;
      case "score": {
        const n = Number(v ?? 0);
        return (
          <span className={cn("font-mono text-xs font-semibold", n >= 80 ? "text-emerald-600" : n >= 60 ? "text-amber-600" : "text-rose-600")}>
            {n}
          </span>
        );
      }
      case "progress":
        return (
          <div className="flex min-w-[90px] items-center gap-2">
            <Progress value={Number(v ?? 0)} className="flex-1" />
            <span className="font-mono text-[11px] text-muted-foreground">{Number(v ?? 0)}%</span>
          </div>
        );
      default:
        return <span className="block max-w-[220px] truncate" title={String(v ?? "")}>{v === undefined || v === "" ? "—" : String(v)}</span>;
    }
  };

  const approvable = tab.approvable ?? ["pending", "draft"];

  const quickAction = (r: WFRecord) => {
    if (tab.key === "candidates" && String(r.status) === "in-progress") {
      return (
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-primary" onClick={() => toast.success(advanceCandidate(r.id))}>
          <Wand2 className="h-3.5 w-3.5" /> Advance
        </Button>
      );
    }
    if (tab.key === "travelRequests" && String(r.status) === "pending") {
      return (
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-emerald-600" onClick={() => toast.success(approveTravel(r.id))}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </Button>
      );
    }
    if (approvable.includes(String(r.status ?? ""))) {
      return (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-emerald-600"
            onClick={() => { wfSetStatus(tab.key, r.id, tab.approveTo ?? "approved"); toast.success(`${r.code ?? "Record"} ${tab.approveTo ?? "approved"}`); }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> {tab.approveTo === "filed" ? "File" : tab.approveTo === "confirmed" ? "Confirm" : tab.approveTo === "paid" ? "Pay" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-rose-600"
            onClick={() => { wfSetStatus(tab.key, r.id, tab.rejectTo ?? "rejected"); toast.success(`${r.code ?? "Record"} ${tab.rejectTo ?? "rejected"}`); }}
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        </>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">{def.title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{def.subtitle}</p>
      </div>

      <AiMetricStrip items={metrics} />

      {def.copilot && (
        <AiCopilotPanel
          title={def.copilotTitle ?? "AI Copilot"}
          subtitle="Grounded in live workforce, safety, administration and compliance data."
          actions={actions}
          askQuery={def.askQuery}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-md border p-0.5 text-xs">
          {def.tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTabKey(t.key)}
              className={cn("rounded px-2.5 py-1", t.key === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${tab.label.toLowerCase()}…`} className="h-9 w-64 pl-8" />
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => exportCsv(tab.key, rows as unknown as Array<Record<string, unknown>>)}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => crud.openNew(tab.key, tab.newLabel, tab.defaults)}>
            <Plus className="h-4 w-4" /> {tab.newLabel}
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {tab.cols.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-4 py-2.5">{c.label}</th>
                ))}
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  {tab.cols.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 align-middle">{cell(r, c)}</td>
                  ))}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {quickAction(r)}
                      <RowActions
                        onEdit={() => crud.openEdit(tab.key, r as Record<string, unknown>, `Edit ${String(r.code ?? tab.label)}`)}
                        onDelete={() => crud.askDelete(tab.key, r.id, String(r.code ?? r.id))}
                        extra={
                          <>
                            <DropdownMenuItem onClick={() => docs.show(workforceDocument(tab.label, r, tab.cols, resolve))}>
                              <Eye className="mr-2 h-4 w-4" /> View / Print
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={tab.cols.length + 1} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No records yet — use “{tab.newLabel}” to add the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {crud.dialogs}
      {docs.dialog}
    </div>
  );
}
