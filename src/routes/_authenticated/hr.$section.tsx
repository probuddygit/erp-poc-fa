import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHR } from "@/lib/hr/store";
import { StatusPill, Progress, fmtCompact, fmtINR, shortDate } from "@/components/projects/shared";
import { Download, Plus, Search, CheckCircle2, XCircle, Mail, Phone, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/hr/$section")({
  head: () => ({ meta: [{ title: "HR · Faith Automation ERP" }] }),
  component: HRSection,
});

function HRSection() {
  const { section } = useParams({ from: "/_authenticated/hr/$section" });
  switch (section) {
    case "employees": return <EmployeesSection />;
    case "attendance": return <AttendanceSection />;
    case "timesheets": return <TimesheetsSection />;
    case "skills": return <SkillsSection />;
    case "payroll": return <PayrollSection />;
    case "reviews": return <ReviewsSection />;
    default: return <div className="p-8 text-sm text-muted-foreground">Unknown section.</div>;
  }
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
function SearchBox({ q, setQ, placeholder }: { q: string; setQ: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-9 w-72 pl-8" />
    </div>
  );
}

/* ---------- Employees ---------- */
function EmployeesSection() {
  const s = useHR((s) => s);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const depts = Array.from(new Set(s.employees.map((e) => e.department)));
  const rows = s.employees.filter(
    (e) => (dept === "all" || e.department === dept) &&
      (e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase()) || e.email.includes(q.toLowerCase())),
  );

  const mgr = (id?: string) => (id ? s.employees.find((e) => e.id === id)?.name ?? "—" : "—");

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <SearchBox q={q} setQ={setQ} placeholder="Search by name, code or email…" />
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          <button onClick={() => setDept("all")} className={cn("rounded px-2.5 py-1", dept === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>All</button>
          {depts.map((d) => (
            <button key={d} onClick={() => setDept(d)} className={cn("rounded px-2.5 py-1", dept === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{d}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Employee</Button>
        </div>
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Employee</th>
                <th className="px-4 py-2.5">Designation</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Manager</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Band</th>
                <th className="px-4 py-2.5 text-right">CTC</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{e.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>
                      <div>
                        <div className="font-medium">{e.name}</div>
                        <div className="text-[11px] text-muted-foreground">{e.code} · {e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{e.designation}</td>
                  <td className="px-4 py-2.5">{e.department}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{mgr(e.managerId)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.location}</td>
                  <td className="px-4 py-2.5"><Badge variant="outline">{e.band}</Badge></td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtCompact(e.ctc)}</td>
                  <td className="px-4 py-2.5"><StatusPill status={e.status === "on-leave" ? "at-risk" : e.status === "notice" ? "blocked" : e.status === "exited" ? "closed" : "active"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Attendance & Leave ---------- */
function AttendanceSection() {
  const s = useHR((s) => s);
  const [tab, setTab] = useState<"today" | "leaves" | "balances">("today");
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = s.attendance.filter((a) => a.date === today);
  const nameOf = (id: string) => s.employees.find((e) => e.id === id)?.name ?? id;
  const codeOf = (id: string) => s.employees.find((e) => e.id === id)?.code ?? "";

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          {(["today", "leaves", "balances"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded px-3 py-1 capitalize", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{t === "today" ? "Today's Attendance" : t === "leaves" ? "Leave Requests" : "Leave Balances"}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Apply Leave</Button>
        </div>
      </Toolbar>

      {tab === "today" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })}</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">In</th>
                  <th className="px-4 py-2.5">Out</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {todayRows.map((a) => {
                  const emp = s.employees.find((e) => e.id === a.empId)!;
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="px-4 py-2.5"><div className="font-medium">{emp.name}</div><div className="text-[11px] text-muted-foreground">{emp.code}</div></td>
                      <td className="px-4 py-2.5 text-muted-foreground">{emp.department}</td>
                      <td className="px-4 py-2.5"><StatusPill status={a.status === "present" ? "active" : a.status === "leave" ? "at-risk" : a.status === "wfh" ? "in-progress" : "upcoming"} /></td>
                      <td className="px-4 py-2.5 font-mono text-xs">{a.in ?? "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{a.out ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{a.hours.toFixed(1)}</td>
                    </tr>
                  );
                })}
                {todayRows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">No attendance recorded for today.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "leaves" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Request</th>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Period</th>
                  <th className="px-4 py-2.5 text-right">Days</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Approver</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {s.leaves.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-2.5 font-mono text-xs">{l.code}</td>
                    <td className="px-4 py-2.5"><div className="font-medium">{nameOf(l.empId)}</div><div className="text-[11px] text-muted-foreground">{codeOf(l.empId)}</div></td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="capitalize">{l.type}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{shortDate(l.from)} → {shortDate(l.to)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{l.days}</td>
                    <td className="px-4 py-2.5 max-w-[240px] truncate text-muted-foreground" title={l.reason}>{l.reason}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{l.approver}</td>
                    <td className="px-4 py-2.5"><StatusPill status={l.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      {l.status === "pending" ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-rose-600"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                        </div>
                      ) : <span className="text-[11px] text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "balances" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5 text-right">Casual</th>
                  <th className="px-4 py-2.5 text-right">Sick</th>
                  <th className="px-4 py-2.5 text-right">Earned</th>
                  <th className="px-4 py-2.5 text-right">Comp-off</th>
                  <th className="px-4 py-2.5 text-right">Total available</th>
                </tr>
              </thead>
              <tbody>
                {s.balances.map((b) => (
                  <tr key={b.empId} className="border-t">
                    <td className="px-4 py-2.5"><div className="font-medium">{nameOf(b.empId)}</div><div className="text-[11px] text-muted-foreground">{codeOf(b.empId)}</div></td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{b.casual}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{b.sick}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{b.earned}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{b.compOff}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{b.casual + b.sick + b.earned + b.compOff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Timesheets ---------- */
function TimesheetsSection() {
  const s = useHR((s) => s);
  const nameOf = (id: string) => s.employees.find((e) => e.id === id)?.name ?? id;
  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <div className="text-sm text-muted-foreground">Week of <span className="font-medium text-foreground">{shortDate(s.timesheets[0]?.weekOf ?? new Date().toISOString())}</span></div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Entry</Button>
        </div>
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Employee</th>
                <th className="px-4 py-2.5">Project</th>
                <th className="px-4 py-2.5">Task</th>
                <th className="px-2 py-2.5 text-right">Mon</th>
                <th className="px-2 py-2.5 text-right">Tue</th>
                <th className="px-2 py-2.5 text-right">Wed</th>
                <th className="px-2 py-2.5 text-right">Thu</th>
                <th className="px-2 py-2.5 text-right">Fri</th>
                <th className="px-2 py-2.5 text-right">Sat</th>
                <th className="px-2 py-2.5 text-right">Sun</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5">Approver</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {s.timesheets.map((t) => {
                const total = t.mon + t.tue + t.wed + t.thu + t.fri + t.sat + t.sun;
                return (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2.5"><div className="font-medium">{nameOf(t.empId)}</div></td>
                    <td className="px-4 py-2.5 font-mono text-xs">{t.projectCode}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{t.taskCode}</td>
                    {[t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun].map((h, i) => (
                      <td key={i} className={cn("px-2 py-2.5 text-right font-mono text-xs", h === 0 ? "text-muted-foreground/50" : "")}>{h || "—"}</td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-semibold">{total}h</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.approver}</td>
                    <td className="px-4 py-2.5"><StatusPill status={t.status === "submitted" ? "pending" : t.status === "approved" ? "approved" : t.status === "rejected" ? "rejected" : "draft"} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Skills & Training ---------- */
function SkillsSection() {
  const s = useHR((s) => s);
  const [tab, setTab] = useState<"matrix" | "trainings">("matrix");

  const matrix = useMemo(() => {
    return s.employees.slice(0, 12).map((e) => ({
      emp: e,
      skills: s.skills.map((sk) => {
        const es = s.empSkills.find((x) => x.empId === e.id && x.skillId === sk.id);
        return { skill: sk, level: es?.level ?? 0, certified: !!es?.certified };
      }),
    }));
  }, [s]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          {(["matrix", "trainings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded px-3 py-1 capitalize", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{t === "matrix" ? "Skill Matrix" : "Training Catalog"}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> {tab === "matrix" ? "Assess Skill" : "New Training"}</Button>
        </div>
      </Toolbar>

      {tab === "matrix" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/80 px-3 py-2.5">Employee</th>
                  {s.skills.map((sk) => (
                    <th key={sk.id} className="px-2 py-2.5 text-center">
                      <div className="whitespace-nowrap font-medium normal-case text-foreground">{sk.name}</div>
                      <div className="text-[10px] normal-case text-muted-foreground">{sk.category}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.emp.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2 whitespace-nowrap">
                      <div className="font-medium text-sm">{row.emp.name}</div>
                      <div className="text-[10px] text-muted-foreground">{row.emp.designation}</div>
                    </td>
                    {row.skills.map(({ skill, level, certified }) => (
                      <td key={skill.id} className="px-2 py-2 text-center">
                        {level > 0 ? (
                          <div className="mx-auto flex w-fit items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px]"
                            style={{
                              backgroundColor: `hsl(217 91% ${95 - level * 8}%)`,
                              color: level >= 4 ? "white" : "hsl(217 30% 25%)",
                            }}>
                            L{level}{certified && <Star className="h-3 w-3 fill-current" />}
                          </div>
                        ) : <span className="text-muted-foreground/40">·</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "trainings" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Training</th>
                  <th className="px-4 py-2.5">Provider</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5">Period</th>
                  <th className="px-4 py-2.5">Enrollment</th>
                  <th className="px-4 py-2.5 text-right">Cost</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {s.trainings.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2.5 font-mono text-xs">{t.code}</td>
                    <td className="px-4 py-2.5"><div className="font-medium">{t.title}</div></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.provider}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline">{t.category}</Badge></td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{t.hours}h</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{shortDate(t.startDate)} → {shortDate(t.endDate)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Progress value={(t.enrolled / t.seats) * 100} className="w-24" />
                        <span className="text-[11px] text-muted-foreground">{t.enrolled}/{t.seats}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtCompact(t.cost)}</td>
                    <td className="px-4 py-2.5"><StatusPill status={t.status === "in-progress" ? "in-progress" : t.status === "completed" ? "done" : t.status === "expired" ? "blocked" : "upcoming"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Payroll ---------- */
function PayrollSection() {
  const s = useHR((s) => s);
  const [runId, setRunId] = useState<string>(s.payrollRuns.find((p) => p.status === "released")?.id ?? s.payrollRuns[0]?.id ?? "");
  const run = s.payrollRuns.find((p) => p.id === runId);
  const slips = s.payslips.filter((p) => p.runId === runId);
  const nameOf = (id: string) => s.employees.find((e) => e.id === id)?.name ?? id;

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {s.payrollRuns.map((p) => (
          <button key={p.id} onClick={() => setRunId(p.id)} className={cn("rounded-lg border p-4 text-left transition-colors", runId === p.id ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "hover:border-foreground/20")}>
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-muted-foreground">{p.code}</div>
              <StatusPill status={p.status === "released" || p.status === "paid" ? "approved" : p.status === "locked" ? "pending" : "draft"} />
            </div>
            <div className="mt-1 font-display text-lg font-semibold">{p.period}</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
              <div><div className="text-muted-foreground">Gross</div><div className="font-mono">{fmtCompact(p.gross)}</div></div>
              <div><div className="text-muted-foreground">Deduct</div><div className="font-mono">{fmtCompact(p.deductions)}</div></div>
              <div><div className="text-muted-foreground">Net</div><div className="font-mono font-semibold">{fmtCompact(p.net)}</div></div>
            </div>
          </button>
        ))}
      </div>

      {run && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Payslips — {run.period}</CardTitle>
              <div className="mt-0.5 text-xs text-muted-foreground">{run.employees} employees · {run.status === "released" ? `released ${shortDate(run.releasedOn ?? run.runOn)}` : `run ${shortDate(run.runOn)}`}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Bank File</Button>
              <Button size="sm" className="gap-2"><Mail className="h-4 w-4" /> Email Payslips</Button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5 text-right">Basic</th>
                  <th className="px-4 py-2.5 text-right">HRA</th>
                  <th className="px-4 py-2.5 text-right">Allowances</th>
                  <th className="px-4 py-2.5 text-right">Gross</th>
                  <th className="px-4 py-2.5 text-right">PF</th>
                  <th className="px-4 py-2.5 text-right">PT</th>
                  <th className="px-4 py-2.5 text-right">TDS</th>
                  <th className="px-4 py-2.5 text-right">Other</th>
                  <th className="px-4 py-2.5 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{nameOf(p.empId)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtINR(p.basic)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtINR(p.hra)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtINR(p.allowances)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{fmtINR(p.gross)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-rose-600">{fmtINR(p.pf)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-rose-600">{fmtINR(p.pt)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-rose-600">{fmtINR(p.tds)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-rose-600">{p.other ? fmtINR(p.other) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-emerald-600">{fmtINR(p.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td className="px-4 py-2.5 text-xs font-semibold uppercase">Total</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{fmtINR(slips.reduce((a, p) => a + p.gross, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtINR(slips.reduce((a, p) => a + p.pf, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtINR(slips.reduce((a, p) => a + p.pt, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtINR(slips.reduce((a, p) => a + p.tds, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtINR(slips.reduce((a, p) => a + p.other, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-emerald-600">{fmtINR(slips.reduce((a, p) => a + p.net, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Performance Reviews ---------- */
function ReviewsSection() {
  const s = useHR((s) => s);
  const nameOf = (id: string) => s.employees.find((e) => e.id === id)?.name ?? id;
  const stages: Array<"self" | "manager" | "calibration" | "closed"> = ["self", "manager", "calibration", "closed"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <div className="text-sm text-muted-foreground">Cycle <span className="font-medium text-foreground">H1 2025</span></div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Cycle</Button>
        </div>
      </Toolbar>

      <div className="grid gap-4 lg:grid-cols-2">
        {s.reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] text-muted-foreground">{r.code}</div>
                  <div className="font-display text-base font-semibold">{nameOf(r.empId)}</div>
                  <div className="text-xs text-muted-foreground">Reviewer: {r.reviewer} · {r.cycle}</div>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-primary">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-sm font-semibold">{r.finalRating || r.managerRating || r.selfRating}/5</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1">
                {stages.map((st, i) => {
                  const currentIdx = stages.indexOf(r.status);
                  const done = i <= currentIdx;
                  return (
                    <div key={st} className="flex flex-1 items-center gap-1">
                      <div className={cn("grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold", done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i + 1}</div>
                      {i < stages.length - 1 && <div className={cn("h-0.5 flex-1", i < currentIdx ? "bg-primary" : "bg-muted")} />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                {stages.map((st) => <div key={st} className="capitalize">{st}</div>)}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Self</div>
                  <div className="font-mono text-sm">{r.selfRating}/5</div>
                </div>
                <div className="rounded-md border p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Manager</div>
                  <div className="font-mono text-sm">{r.managerRating || "—"}/5</div>
                </div>
                <div className="rounded-md border p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Goals</div>
                  <div className="font-mono text-sm">{r.goalsAchieved}/{r.goals}</div>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div><span className="font-semibold text-emerald-700">Strengths:</span> <span className="text-muted-foreground">{r.strengths}</span></div>
                <div><span className="font-semibold text-amber-700">Improvements:</span> <span className="text-muted-foreground">{r.improvements}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
