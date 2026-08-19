import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Pencil, Printer } from "lucide-react";
import { adminStore, useAdmin } from "@/lib/admin/store";
import { RecordDialog, type FieldSpec } from "@/components/record-dialog";
import { printRows } from "@/lib/reports/export";
import { AdminCrudTable, type Row } from "@/components/admin/crud-table";

const COMPANY_FIELDS: FieldSpec[] = [
  { name: "legalName", label: "Legal name", type: "text", required: true, colSpan: 2 },
  { name: "name", label: "Short name", type: "text", required: true },
  { name: "code", label: "Company code", type: "text", required: true },
  { name: "gstin", label: "GSTIN", type: "text" },
  { name: "pan", label: "PAN", type: "text" },
  { name: "cin", label: "CIN", type: "text" },
  { name: "currency", label: "Base currency", type: "select", options: ["INR", "USD", "EUR"] },
  { name: "fyStart", label: "FY start (MM-DD)", type: "text" },
];

export function CompanyPanel() {
  const co = useAdmin((s) => s.companies[0]);
  const [editCo, setEditCo] = useState(false);
  if (!co) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-primary" /> Company profile</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows("Company profile", [co as unknown as Row])}><Printer className="h-3.5 w-3.5" /> Print</Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setEditCo(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["Legal Name", co.legalName], ["Short Name", co.name], ["GSTIN", co.gstin], ["PAN", co.pan],
            ["CIN", co.cin], ["Base Currency", co.currency], ["FY Start", co.fyStart], ["Company Code", co.code],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="rounded-md border p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="mt-1 text-sm font-medium">{v}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <RecordDialog
        open={editCo}
        onOpenChange={setEditCo}
        title="Edit company"
        fields={COMPANY_FIELDS}
        initial={co as unknown as Row}
        onSubmit={(v) => { adminStore.saveCompany(v as never); toast.success("Company updated"); setEditCo(false); }}
      />
    </div>
  );
}

export function BranchesPanel() {
  const co = useAdmin((s) => s.companies[0]);

  return (
    <AdminCrudTable
      collection="branches"
      title="Branches / Locations"
      icon={<MapPin className="h-4 w-4 text-primary" />}
      searchKeys={["code", "name", "city", "state"]}
      toggleField="active"
      columns={[
        { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{String(r.name)}</span> },
        { key: "type", label: "Type", render: (r) => <Badge variant="outline" className="text-[10px]">{String(r.type)}</Badge> },
        { key: "city", label: "Location", render: (r) => <span className="text-xs">{String(r.city)}, {String(r.state)}</span> },
        { key: "gstin", label: "GSTIN", render: (r) => <span className="font-mono text-xs">{String(r.gstin)}</span> },
        { key: "headcount", label: "Headcount", align: "right" },
      ]}
      fields={[
        { name: "code", label: "Branch code", type: "text", required: true },
        { name: "name", label: "Branch name", type: "text", required: true },
        { name: "type", label: "Type", type: "select", options: ["HQ", "Plant", "Warehouse", "Sales-Office"], required: true },
        { name: "city", label: "City", type: "text", required: true },
        { name: "state", label: "State", type: "text", required: true },
        { name: "gstin", label: "GSTIN", type: "text" },
        { name: "headcount", label: "Headcount", type: "number" },
      ]}
      transformOut={(v) => ({ ...v, companyId: co?.id, headcount: Number(v.headcount ?? 0), active: true })}
    />
  );
}
