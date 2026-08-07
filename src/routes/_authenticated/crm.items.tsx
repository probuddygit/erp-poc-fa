import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Sparkles, Trash2, AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComboboxField } from "@/components/combobox-field";
import { fmtINR } from "@/components/crm/shared";
import {
  ITEM_CATEGORIES,
  UOMS,
  deleteItem,
  previewItemCode,
  saveItemCodeConfig,
  upsertItem,
  useRevenue,
  validateItem,
  type ItemMaster,
} from "@/lib/crm/revenue";

export const Route = createFileRoute("/_authenticated/crm/items")({
  head: () => ({
    meta: [
      { title: "Item Master · Revenue Lifecycle · Faith Automation ERP" },
      {
        name: "description",
        content:
          "Configurable item codes with AI validation and duplicate detection for the Faith Automation revenue lifecycle.",
      },
      { property: "og:title", content: "Item Master · Revenue Lifecycle" },
      {
        property: "og:description",
        content: "Configurable item coding, AI item validation and duplicate detection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ItemMasterPage,
});

const EMPTY = { description: "", category: "", uom: "Nos", rate: 0, hsn: "", code: "" };

function ItemMasterPage() {
  const items = useRevenue((s) => s.items);
  const config = useRevenue((s) => s.config);
  const [draft, setDraft] = useState<Partial<ItemMaster>>(EMPTY);
  const [q, setQ] = useState("");

  const validation = useMemo(() => validateItem(draft, items), [draft, items]);
  const filtered = items.filter((i) =>
    `${i.code} ${i.description} ${i.category}`.toLowerCase().includes(q.toLowerCase()),
  );

  const save = () => {
    if (validation.issues.length) {
      toast.error(validation.issues[0]);
      return;
    }
    upsertItem(draft);
    setDraft(EMPTY);
    toast.success("Item saved to the master");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Create / edit item</CardTitle>
            <p className="text-xs text-muted-foreground">
              Leave the code blank to auto-generate <span className="font-mono">{previewItemCode(config, draft.category ?? "General")}</span>
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={draft.description ?? ""}
                placeholder="e.g. 6-axis welding robot with controller"
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <ComboboxField
                value={draft.category ?? ""}
                options={ITEM_CATEGORIES.map((c) => ({ value: c, label: c }))}
                onChange={(v) => setDraft({ ...draft, category: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Unit of measure</Label>
              <ComboboxField
                value={draft.uom ?? ""}
                options={UOMS.map((u) => ({ value: u, label: u }))}
                onChange={(v) => setDraft({ ...draft, uom: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Standard rate (₹)</Label>
              <Input
                type="number"
                value={draft.rate ?? 0}
                onChange={(e) => setDraft({ ...draft, rate: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">HSN / SAC</Label>
              <Input value={draft.hsn ?? ""} onChange={(e) => setDraft({ ...draft, hsn: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Item code (optional override)</Label>
              <Input
                className="font-mono"
                value={draft.code ?? ""}
                placeholder="auto"
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button className="gap-2" onClick={save}>
                <Plus className="h-4 w-4" /> {draft.id ? "Update item" : "Create item"}
              </Button>
              <Button variant="ghost" onClick={() => setDraft(EMPTY)}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI item validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={validation.confidence > 70 ? "default" : "outline"}>
                  Confidence {validation.confidence}%
                </Badge>
              </div>
              {validation.issues.map((i) => (
                <p key={i} className="flex gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {i}
                </p>
              ))}
              {validation.suggestions.map((i) => (
                <p key={i} className="flex gap-2 text-muted-foreground">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {i}
                </p>
              ))}
              {!validation.issues.length && !validation.suggestions.length && (
                <p className="flex gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" /> Ready to publish.
                </p>
              )}
              {Boolean(validation.duplicates.length) && (
                <div className="rounded-md border bg-muted/40 p-2">
                  <p className="mb-1 text-xs font-medium">Possible duplicates</p>
                  {validation.duplicates.map((d) => (
                    <button
                      key={d.item.id}
                      className="block w-full text-left text-xs hover:underline"
                      onClick={() => setDraft(d.item)}
                    >
                      <span className="font-mono">{d.item.code}</span> — {d.item.description}{" "}
                      <span className="text-muted-foreground">({Math.round(d.score * 100)}% match)</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Settings2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Item code configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Prefix</Label>
                  <Input value={config.prefix} onChange={(e) => saveItemCodeConfig({ prefix: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Separator</Label>
                  <Input value={config.separator} onChange={(e) => saveItemCodeConfig({ separator: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Padding</Label>
                  <Input
                    type="number"
                    value={config.padding}
                    onChange={(e) => saveItemCodeConfig({ padding: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Include category segment</span>
                <Switch
                  checked={config.categorySegment}
                  onCheckedChange={(v) => saveItemCodeConfig({ categorySegment: v })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Next code: <span className="font-mono">{previewItemCode(config, draft.category || "Robotics")}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Item master ({items.length})</CardTitle>
          <Input className="max-w-xs" placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.code}</TableCell>
                    <TableCell>{i.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {i.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{i.uom}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(i.rate)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.hsn ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDraft(i)}>
                        Edit
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          deleteItem(i.id);
                          toast.success("Item removed");
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
