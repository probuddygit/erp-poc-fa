import { useMemo, useState } from "react";
import { ArrowLeftRight, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ComboboxField } from "@/components/combobox-field";
import { fmtINR } from "@/components/crm/shared";
import { useInventory } from "@/lib/inventory/store";
import { useProjectsStore } from "@/lib/projects/store";
import {
  executeReallocation,
  reallocatableStock,
  validateReallocation,
} from "@/lib/inventory/reallocation";

/**
 * Moves unconsumed, project-tagged stock from one project to another and fires
 * the matching cost transfer + budget adjustment.
 */
export function ReallocateDialog() {
  const state = useInventory((s) => s);
  const projects = useProjectsStore((s) => s.projects);
  const [open, setOpen] = useState(false);
  const [stockId, setStockId] = useState("");
  const [toProject, setToProject] = useState("");
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState("");

  const stockOptions = useMemo(
    () =>
      reallocatableStock(state).map((r) => ({
        value: r.id,
        label: `${r.itemCode} · ${r.projectCode}`,
        hint: `${r.qty} ${r.uom} @ ${r.storeCode} · ${r.description}`,
      })),
    [state],
  );

  const check = useMemo(
    () => validateReallocation({ stockId, toProject, qty, reason }, state),
    [stockId, toProject, qty, reason, state],
  );

  const reset = () => {
    setStockId("");
    setToProject("");
    setQty(0);
    setReason("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowLeftRight className="h-4 w-4" /> Project Reallocation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reallocate stock between projects</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Project-tagged stock line</Label>
            <ComboboxField
              value={stockId}
              options={stockOptions}
              onChange={(v) => {
                setStockId(v);
                setQty(0);
              }}
            />
            {!stockOptions.length && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                No unconsumed project-tagged stock is available to reallocate.
              </p>
            )}
          </div>

          {check.row && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{check.row.projectCode}</Badge>
                <span className="font-mono">{check.row.itemCode}</span>
                <span className="text-muted-foreground">{check.row.description}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Available {check.available} {check.row.uom} at {check.row.storeCode} · rate {fmtINR(check.rate)}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Destination project</Label>
              <ComboboxField
                value={toProject}
                options={projects
                  .filter((p) => p.code !== check.row?.projectCode)
                  .map((p) => ({ value: p.code, label: p.code, hint: p.name }))}
                onChange={setToProject}
              />
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Reason (mandatory)</Label>
            <Textarea
              value={reason}
              placeholder="e.g. Surplus after FAT — redeployed to the next line build"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cost transferred</span>
              <span className="font-semibold tabular-nums">{fmtINR(check.value)}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Credits material cost on {check.row?.projectCode ?? "the source project"} and debits{" "}
              {toProject || "the destination"}, with a matching budget adjustment.
            </p>
          </div>

          {check.issues.map((i) => (
            <p key={i} className="flex gap-2 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {i}
            </p>
          ))}
          {check.warnings.map((w) => (
            <p key={w} className="flex gap-2 text-xs text-amber-600 dark:text-amber-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
            </p>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={Boolean(check.issues.length)}
            onClick={() => {
              const res = executeReallocation({ stockId, toProject, qty, reason });
              if (!res.ok) {
                toast.error(res.message);
                return;
              }
              toast.success(res.message, { description: `Transfer ${res.transferCode} posted to Finance` });
              setOpen(false);
              reset();
            }}
          >
            Reallocate & post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
