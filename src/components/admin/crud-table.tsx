import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Pencil, Trash2, Download, Printer, Mail, Upload, MoreHorizontal, FileText, FileSpreadsheet,
} from "lucide-react";
import { adminStore, useAdmin } from "@/lib/admin/store";
import type { AdminState } from "@/lib/admin/store";
import { RecordDialog, ConfirmDialog, type FieldSpec } from "@/components/record-dialog";
import { exportCsvRows, exportExcelRows, exportPdfRows, printRows, emailRows, parseCsv, readFileText } from "@/lib/reports/export";

export type Row = Record<string, unknown>;
export interface Col { key: string; label: string; align?: "right"; render?: (r: Row) => ReactNode; }

export function ToolBar({
  title, icon, rows, onNew, onImport, extra,
}: {
  title: string; icon: ReactNode; rows: Row[]; onNew?: () => void;
  onImport?: (rows: Row[]) => void; extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <CardTitle className="flex items-center gap-2 text-sm">{icon} {title}</CardTitle>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {onImport && (
          <Button
            size="sm" variant="outline" className="h-8 gap-1.5"
            onClick={async () => {
              const f = await readFileText(".csv");
              if (!f) return;
              const parsed = parseCsv(f.text);
              onImport(parsed);
              toast.success(`${parsed.length} rows imported`);
            }}
          ><Upload className="h-3.5 w-3.5" /> Import</Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportCsvRows(title, rows)}><FileText className="mr-2 h-4 w-4" /> CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportExcelRows(title, rows)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPdfRows(title, rows)}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => printRows(title, rows)}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
            <DropdownMenuItem onClick={() => emailRows(title, rows)}><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {onNew && <Button size="sm" className="h-8 gap-1.5" onClick={onNew}><Plus className="h-3.5 w-3.5" /> New</Button>}
      </div>
    </div>
  );
}

/** Generic CRUD table over an admin collection. */
export function AdminCrudTable({
  collection, title, icon, columns, fields, searchKeys, toggleField, transformIn, transformOut, filter, banner,
}: {
  collection: keyof AdminState;
  title: string;
  icon: ReactNode;
  columns: Col[];
  fields: FieldSpec[];
  searchKeys: string[];
  toggleField?: string;
  transformIn?: (r: Row) => Row;
  transformOut?: (v: Row) => Row;
  /** Restrict the visible rows (e.g. to the active company). */
  filter?: (r: Row) => boolean;
  /** Rendered above the table, inside the card. */
  banner?: ReactNode;
}) {
  const all = useAdmin((s) => s[collection]) as unknown as Row[];
  const data = filter ? all.filter(filter) : all;
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [edit, setEdit] = useState<{ record?: Row } | null>(null);
  const [del, setDel] = useState<{ ids: string[]; label: string } | null>(null);

  const list = data.filter((r) =>
    q === "" || searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q.toLowerCase()))
  );
  const allSelected = list.length > 0 && list.every((r) => sel.includes(r.id as string));

  return (
    <Card>
      <CardHeader className="pb-2">
        <ToolBar
          title={title}
          icon={icon}
          rows={list}
          onNew={() => setEdit({})}
          onImport={(rows) => rows.forEach((r) => adminStore.upsert(collection as never, r))}
          extra={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 w-56 pl-9" />
            </div>
          }
        />
        {sel.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
            <span className="text-xs text-muted-foreground">{sel.length} selected</span>
            <Button size="sm" variant="outline" className="h-7" onClick={() => exportExcelRows(`${title}-selection`, data.filter((r) => sel.includes(r.id as string)))}>Export</Button>
            {toggleField && (
              <>
                <Button size="sm" variant="outline" className="h-7" onClick={() => { sel.forEach((id) => { const r = data.find((x) => x.id === id); if (r && !r[toggleField]) adminStore.toggleField(collection as never, id, toggleField); }); toast.success("Activated"); }}>Activate</Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => { sel.forEach((id) => { const r = data.find((x) => x.id === id); if (r && r[toggleField]) adminStore.toggleField(collection as never, id, toggleField); }); toast.success("Deactivated"); }}>Deactivate</Button>
              </>
            )}
            <Button size="sm" variant="destructive" className="h-7" onClick={() => setDel({ ids: sel, label: `${sel.length} records` })}>Delete</Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox checked={allSelected} onCheckedChange={(v) => setSel(v ? list.map((r) => r.id as string) : [])} aria-label="Select all" />
              </TableHead>
              {columns.map((c) => <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.label}</TableHead>)}
              {toggleField && <TableHead className="text-right">Active</TableHead>}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id as string}>
                <TableCell>
                  <Checkbox
                    checked={sel.includes(r.id as string)}
                    onCheckedChange={(v) => setSel((s) => v ? [...s, r.id as string] : s.filter((x) => x !== r.id))}
                    aria-label="Select row"
                  />
                </TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.align === "right" ? "text-right tabular-nums" : ""}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                  </TableCell>
                ))}
                {toggleField && (
                  <TableCell className="text-right">
                    <Switch checked={Boolean(r[toggleField])} onCheckedChange={() => adminStore.toggleField(collection as never, r.id as string, toggleField)} />
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEdit({ record: transformIn ? transformIn(r) : r })}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const { id: _id, ...rest } = r; void _id; adminStore.upsert(collection as never, { ...rest, name: `${String(r.name ?? r.code ?? "Copy")} (copy)` }); toast.success("Duplicated"); }}><Plus className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => printRows(title, [r])}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDel({ ids: [r.id as string], label: String(r.name ?? r.code ?? "record") })}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow><TableCell colSpan={columns.length + 3} className="py-10 text-center text-sm text-muted-foreground">No records.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <RecordDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.record ? `Edit ${title}` : `New ${title}`}
        fields={fields}
        initial={edit?.record}
        onSubmit={(values) => {
          const payload = transformOut ? transformOut(values) : values;
          adminStore.upsert(collection as never, { ...(edit?.record ?? {}), ...payload });
          toast.success(edit?.record ? "Saved" : "Created");
          setEdit(null);
        }}
      />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete record?"
        message={del ? `“${del.label}” will be permanently removed.` : ""}
        onConfirm={() => { if (del) { adminStore.remove(collection as never, del.ids); setSel([]); toast.success("Deleted"); } setDel(null); }}
      />
    </Card>
  );
}
