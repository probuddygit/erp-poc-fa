import { useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  Download,
  Filter as FilterIcon,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  Eye,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { mdmStore, useMasterList } from "@/lib/mdm/store";
import type { ApprovalStatus, MasterDef } from "@/lib/mdm/types";
import { formatFieldValue } from "./field-renderer";
import { StatusBadge } from "./status-badge";
import { ImportDialog } from "./import-dialog";
import { toCsv, downloadFile } from "@/lib/mdm/csv";

const STATUS_OPTIONS: { label: string; value: ApprovalStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

interface MasterListProps {
  def: MasterDef;
}

export function MasterList({ def }: MasterListProps) {
  const records = useMasterList(def.key);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("all");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);

  const searchableKeys = useMemo(
    () => def.fields.filter((f) => f.searchable).map((f) => f.key),
    [def],
  );
  const listColumns = useMemo(
    () => def.fields.filter((f) => f.showInList).slice(0, 5),
    [def],
  );
  const filterFields = useMemo(
    () => def.fields.filter((f) => f.filterable),
    [def],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      for (const [k, v] of Object.entries(filters)) {
        if (v === "" || v === "__all__") continue;
        const rv = r.data[k];
        if (typeof rv === "boolean") {
          if (String(rv) !== v) return false;
        } else if (String(rv ?? "") !== v) return false;
      }
      if (!q) return true;
      if (r.code.toLowerCase().includes(q)) return true;
      for (const k of searchableKeys) {
        const v = r.data[k];
        if (v && String(v).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [records, query, statusFilter, filters, searchableKeys]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };
  const clearFilters = () => {
    setStatusFilter("all");
    setFilters({});
    setQuery("");
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    mdmStore.remove(def.key, ids);
    setSelected(new Set());
    toast.success(`Deleted ${ids.length} ${def.pluralName.toLowerCase()}`);
  };

  const handleExport = () => {
    const headers = ["code", "status", ...def.fields.filter((f) => f.importable).map((f) => f.key)];
    const rows = filtered.map((r) => ({ code: r.code, status: r.status, ...r.data }));
    downloadFile(`${def.key}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
    toast.success(`Exported ${filtered.length} rows`);
  };

  const Icon = def.icon;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    Object.values(filters).filter((v) => v && v !== "__all__").length;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${def.accentClass ?? "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{def.pluralName}</h1>
              <Badge variant="outline" className="font-mono text-[10px]">
                {records.length}
              </Badge>
            </div>
            {def.description && (
              <p className="text-sm text-muted-foreground">{def.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link to="/masters/$master/new" params={{ master: def.key }}>
              <Plus className="h-4 w-4" /> New {def.name}
            </Link>
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <Card className="border-border/60 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${def.pluralName.toLowerCase()} by code${searchableKeys.length ? " or " + searchableKeys.slice(0, 2).join(", ") : ""}…`}
              className="h-9 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FilterIcon className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filterFields.map((f) => (
              <Select
                key={f.key}
                value={filters[f.key] ?? "__all__"}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, [f.key]: v }))}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All {f.label}</SelectItem>
                  {f.type === "boolean" ? (
                    <>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </>
                  ) : (
                    f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ))}

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{selected.size} selected</span>
              <span className="text-muted-foreground"> · bulk actions ready</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Deselect
              </Button>
              <Button size="sm" variant="destructive" className="gap-2" onClick={handleDeleteSelected}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-32">Code</TableHead>
                {listColumns.map((f) => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={listColumns.length + 4} className="h-40 text-center text-sm text-muted-foreground">
                    {records.length === 0 ? (
                      <div className="space-y-2">
                        <div>No {def.pluralName.toLowerCase()} yet.</div>
                        <Button asChild size="sm" className="gap-2">
                          <Link to="/masters/$master/new" params={{ master: def.key }}>
                            <Plus className="h-4 w-4" /> Create the first {def.name}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <>No records match your filters.</>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate({ to: "/masters/$master/$id", params: { master: def.key, id: r.id } })}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggle(r.id)}
                        aria-label={`Select ${r.code}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">{r.code}</TableCell>
                    {listColumns.map((f) => (
                      <TableCell key={f.key} className="text-sm">
                        {formatFieldValue(f, r.data[f.key])}
                      </TableCell>
                    ))}
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <Link to="/masters/$master/$id" params={{ master: def.key, id: r.id }} className="gap-2">
                              <Eye className="h-4 w-4" /> View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/masters/$master/$id/edit" params={{ master: def.key, id: r.id }} className="gap-2">
                              <Pencil className="h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive"
                            onClick={() => {
                              mdmStore.remove(def.key, [r.id]);
                              toast.success(`Deleted ${r.code}`);
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <div>Showing {filtered.length} of {records.length}</div>
          <div>Framework: metadata-driven MDM · {def.fields.length} fields</div>
        </div>
      </Card>

      <ImportDialog def={def} open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
