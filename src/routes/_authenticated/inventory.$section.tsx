import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Download, ArrowRightLeft, CheckCircle2, Package, MapPin } from "lucide-react";
import { useInventory, upsertInventory, deleteInventory, postCycleCount, setTransferStatus } from "@/lib/inventory/store";
import { INVENTORY_SCHEMAS } from "@/lib/inventory/schemas";
import { useInventoryOptions } from "@/lib/inventory/options";
import { RowActions, useCrud } from "@/components/crud-kit";
import { exportCsv } from "@/lib/crud";
import { toast } from "sonner";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";

export const Route = createFileRoute("/_authenticated/inventory/$section")({
  head: () => ({ meta: [{ title: "Inventory · Faith Automation ERP" }] }),
  component: SectionView,
  notFoundComponent: () => (
    <div className="p-12 text-center text-sm text-muted-foreground">Section not found.</div>
  ),
});

const VALID = new Set(["items", "stores", "stock", "batches", "transfers", "counts"]);

function SectionView() {
  const { section } = Route.useParams();
  if (!VALID.has(section)) throw notFound();
  if (section === "items") return <ItemsView />;
  if (section === "stores") return <StoresView />;
  if (section === "stock") return <StockView />;
  if (section === "batches") return <BatchesView />;
  if (section === "transfers") return <TransfersView />;
  return <CountsView />;
}

function Toolbar({ title, description, q, setQ, onNew, onExport, newLabel = "New" }: {
  title: string; description: string; q: string; setQ: (v: string) => void;
  onNew?: () => void; onExport?: () => void; newLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-64 pl-8" />
        </div>
        {onExport && <Button variant="outline" size="sm" className="gap-2" onClick={onExport}><Download className="h-4 w-4" />Export</Button>}
        {onNew && <Button size="sm" className="gap-2" onClick={onNew}><Plus className="h-4 w-4" />{newLabel}</Button>}
      </div>
    </div>
  );
}

/* ============== ITEMS ============== */
function ItemsView() {
  const items = useInventory((s) => s.items);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const lookups = useInventoryOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(INVENTORY_SCHEMAS, upsertInventory, deleteInventory, lookups);


  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return items.filter((i) => (cat === "all" || i.category === cat)
      && (!q || [i.code, i.description, i.category].some((x) => x.toLowerCase().includes(l))));
  }, [items, q, cat]);

  const cats = ["all", "Raw Material", "Component", "Sub-Assembly", "Finished Good", "Consumable"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Item Master & UoM" description="SKUs across raw material, components, sub-assemblies and finished goods with tracking mode and reorder policy." q={q} setQ={setQ} newLabel="New Item"
        onExport={() => exportCsv("inventory-items", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("items", "New Item", { category: "Component", uom: "EA", tracking: "none", onHand: 0, allocated: 0, reorder: 0, maxLevel: 0, stdCost: 0 })} />

      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${cat === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {c} <span className="ml-1 text-[10px] opacity-60">{c === "all" ? items.length : items.filter((i) => i.category === c).length}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">UoM</th>
                <th className="p-3 text-left">Tracking</th>
                <th className="p-3 text-right">On Hand</th>
                <th className="p-3 text-right">Allocated</th>
                <th className="p-3 text-right">Reorder</th>
                <th className="p-3 text-right">Std Cost</th>
                <th className="p-3 text-left w-32">Coverage</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((i) => {
                const free = i.onHand - i.allocated;
                const pct = Math.min(100, Math.round((free / (i.maxLevel || 1)) * 100));
                return (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{i.code}</td>
                    <td className="p-3">
                      <div className="font-medium">{i.description}</div>
                      {i.hsn && <div className="text-[10px] text-muted-foreground">HSN {i.hsn}</div>}
                    </td>
                    <td className="p-3"><Badge variant="outline">{i.category}</Badge></td>
                    <td className="p-3 font-mono text-xs">{i.uom}</td>
                    <td className="p-3"><Badge variant="secondary" className="border-0 capitalize">{i.tracking}</Badge></td>
                    <td className="p-3 text-right font-mono">{i.onHand}</td>
                    <td className="p-3 text-right font-mono text-xs text-muted-foreground">{i.allocated}</td>
                    <td className="p-3 text-right font-mono text-xs">{i.reorder}</td>
                    <td className="p-3 text-right font-mono">{fmtCompact(i.stdCost)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Progress value={pct} /></div>
                        <span className="w-8 text-right font-mono text-[10px]">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <RowActions
                        onEdit={() => openEdit("items", i as unknown as Record<string, unknown>, "Edit Item")}
                        onDelete={() => askDelete("items", i.id, i.code)}
                      />
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">No items match this filter.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
    </div>
  );
}

/* ============== STORES & BINS ============== */
function StoresView() {
  const stores = useInventory((s) => s.stores);
  const bins = useInventory((s) => s.bins);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>(stores[0]?.code ?? "");
  const lookups = useInventoryOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(INVENTORY_SCHEMAS, upsertInventory, deleteInventory, lookups);


  const filtered = useMemo(() => {
    const l = q.toLowerCase();
    return stores.filter((s) => !q || [s.code, s.name, s.location, s.manager].some((x) => x.toLowerCase().includes(l)));
  }, [stores, q]);

  const activeStore = stores.find((s) => s.code === selected) ?? stores[0];
  const storeBins = bins.filter((b) => b.storeCode === activeStore?.code);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Multi-Store & Bin Locations" description="Central, shop-floor, bonded, project and scrap stores with zone / aisle / rack / level bin structure." q={q} setQ={setQ} newLabel="New Store"
        onExport={() => exportCsv("stores", filtered as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("stores", "New Store", { type: "Central", active: true, bins: 0, capacityUsedPct: 0 })} />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardContent className="p-2 space-y-1 max-h-[560px] overflow-y-auto">
            {filtered.map((st) => (
              <button key={st.id} onClick={() => setSelected(st.code)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${st.code === activeStore?.code ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{st.code}</span>
                      <Badge variant="outline" className="text-[10px]">{st.type}</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">{st.name}</div>
                    <div className="text-xs text-muted-foreground">{st.location}</div>
                  </div>
                  <div className="text-right font-mono text-[10px]">
                    <div>{st.bins} bins</div>
                    <div className="text-muted-foreground">{st.capacityUsedPct}%</div>
                  </div>
                </div>
                <div className="mt-2"><Progress value={st.capacityUsedPct} /></div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            {activeStore && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{activeStore.code}</span>
                      <StatusPill status={activeStore.active ? "active" : "on-hold"} />
                    </div>
                    <h3 className="mt-0.5 font-display text-lg font-semibold">{activeStore.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{activeStore.location} · Manager {activeStore.manager}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-2"
                      onClick={() => openNew("bins", "New Bin", { storeCode: activeStore.code, qty: 0, uom: "EA" })}>
                      <Plus className="h-4 w-4" />Bin
                    </Button>
                    <RowActions
                      onEdit={() => openEdit("stores", activeStore as unknown as Record<string, unknown>, "Edit Store")}
                      onDelete={() => askDelete("stores", activeStore.id, activeStore.name)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Bin</th>
                        <th className="p-3 text-left">Zone / Aisle / Rack / Level</th>
                        <th className="p-3 text-left">Item</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {storeBins.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{b.code}</td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">{b.zone} / {b.aisle} / {b.rack} / {b.level}</td>
                          <td className="p-3">{b.itemCode ? <>
                            <div className="font-mono text-xs">{b.itemCode}</div>
                          </> : <span className="text-xs text-muted-foreground">empty</span>}</td>
                          <td className="p-3 text-right font-mono">{b.qty} <span className="text-[10px] text-muted-foreground">{b.uom}</span></td>
                          <td className="p-3 text-right">
                            <RowActions
                              onEdit={() => openEdit("bins", b as unknown as Record<string, unknown>, "Edit Bin")}
                              onDelete={() => askDelete("bins", b.id, b.code)}
                            />
                          </td>
                        </tr>
                      ))}
                      {!storeBins.length && <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No bins mapped.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {dialogs}
    </div>
  );
}

/* ============== STOCK BY PROJECT ============== */
function StockView() {
  const stock = useInventory((s) => s.stock);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const lookups = useInventoryOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(INVENTORY_SCHEMAS, upsertInventory, deleteInventory, lookups);


  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return stock.filter((r) => (status === "all" || r.status === status)
      && (!q || [r.itemCode, r.description, r.storeName, r.projectCode ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [stock, q, status]);

  const filters = ["all", "available", "reserved", "quality-hold", "in-transit"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Stock by Project & Location" description="Project-tagged inventory with store, bin, reservation status and valuation." q={q} setQ={setQ} newLabel="New Stock Line"
        onExport={() => exportCsv("stock", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("stock", "New Stock Line", { status: "available", qty: 0, value: 0, uom: "EA" })} />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {f.replace("-", " ")} <span className="ml-1 text-[10px] opacity-60">{f === "all" ? stock.length : stock.filter((r) => r.status === f).length}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Store</th>
                <th className="p-3 text-left">Bin</th>
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Value</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-xs text-muted-foreground">{r.itemCode}</div>
                    <div className="font-medium">{r.description}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">{r.storeName}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{r.storeCode}</div>
                  </td>
                  <td className="p-3 font-mono text-xs">{r.binCode ?? "—"}</td>
                  <td className="p-3">{r.projectCode ? <Badge variant="outline" className="text-[10px]">{r.projectCode}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-right font-mono">{r.qty} <span className="text-[10px] text-muted-foreground">{r.uom}</span></td>
                  <td className="p-3 text-right font-mono">{fmtCompact(r.value)}</td>
                  <td className="p-3"><StatusPill status={r.status === "quality-hold" ? "on-hold" : r.status === "available" ? "approved" : r.status === "reserved" ? "in-progress" : "pending"} /></td>
                  <td className="p-3 text-right">
                    <RowActions
                      onEdit={() => openEdit("stock", r as unknown as Record<string, unknown>, "Edit Stock Line")}
                      onDelete={() => askDelete("stock", r.id, `${r.itemCode} @ ${r.storeCode}`)}
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No stock records.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
    </div>
  );
}

/* ============== BATCH / SERIAL / LOT ============== */
function BatchesView() {
  const batches = useInventory((s) => s.batches);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const lookups = useInventoryOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(INVENTORY_SCHEMAS, upsertInventory, deleteInventory, lookups);


  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return batches.filter((b) => (status === "all" || b.status === status)
      && (!q || [b.itemCode, b.description, b.batchNo, b.vendorName ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [batches, q, status]);

  const filters = ["all", "available", "expiring", "expired", "quarantined"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Batch, Serial & Lot Tracking" description="Full traceability with mfg / expiry dates, serial ranges and vendor batch numbers." q={q} setQ={setQ} newLabel="New Batch"
        onExport={() => exportCsv("batches", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("batches", "New Batch / Lot", { status: "available", qty: 0, uom: "EA", mfgDate: new Date().toISOString() })} />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {f} <span className="ml-1 text-[10px] opacity-60">{f === "all" ? batches.length : batches.filter((b) => b.status === f).length}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Batch / Lot</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Serial Range</th>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Mfg / Expiry</th>
                <th className="p-3 text-left">Store</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{b.batchNo}</td>
                  <td className="p-3">
                    <div className="font-mono text-[11px] text-muted-foreground">{b.itemCode}</div>
                    <div className="font-medium">{b.description}</div>
                  </td>
                  <td className="p-3 font-mono text-[11px]">{b.serialFrom ? `${b.serialFrom} → ${b.serialTo}` : "—"}</td>
                  <td className="p-3 text-xs">{b.vendorName ?? "—"}</td>
                  <td className="p-3 text-xs">
                    <div>{shortDate(b.mfgDate)}</div>
                    {b.expiryDate && <div className={b.status === "expired" || b.status === "expiring" ? "text-rose-600 dark:text-rose-300 font-medium" : "text-muted-foreground"}>exp {shortDate(b.expiryDate)}</div>}
                  </td>
                  <td className="p-3 font-mono text-xs">{b.storeCode}</td>
                  <td className="p-3 text-right font-mono">{b.qty} <span className="text-[10px] text-muted-foreground">{b.uom}</span></td>
                  <td className="p-3"><StatusPill status={b.status === "available" ? "approved" : b.status === "expiring" ? "on-hold" : b.status === "expired" ? "rejected" : "pending"} /></td>
                  <td className="p-3 text-right">
                    <RowActions
                      onEdit={() => openEdit("batches", b as unknown as Record<string, unknown>, "Edit Batch")}
                      onDelete={() => askDelete("batches", b.id, b.batchNo)}
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">No batches.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
    </div>
  );
}

/* ============== TRANSFERS ============== */
function TransfersView() {
  const transfers = useInventory((s) => s.transfers);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const lookups = useInventoryOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(INVENTORY_SCHEMAS, upsertInventory, deleteInventory, lookups);


  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return transfers.filter((t) => (status === "all" || t.status === status)
      && (!q || [t.code, t.itemCode, t.description, t.fromStore, t.toStore ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [transfers, q, status]);

  const filters = ["all", "draft", "requested", "in-transit", "received", "cancelled"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Stock Transfers & Adjustments" description="Store-to-store transfers, shop-floor issues, project returns and cycle-count adjustments." q={q} setQ={setQ} newLabel="New Transfer"
        onExport={() => exportCsv("transfers", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("transfers", "New Stock Transfer", { status: "draft", type: "transfer", qty: 0, uom: "EA", createdAt: new Date().toISOString(), requestedBy: "Stores" })} />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {f.replace("-", " ")} <span className="ml-1 text-[10px] opacity-60">{f === "all" ? transfers.length : transfers.filter((t) => t.status === f).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((t) => (
          <Card key={t.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{t.type}</Badge>
                    {t.projectCode && <Badge variant="secondary" className="text-[10px]">{t.projectCode}</Badge>}
                  </div>
                  <div className="mt-1 font-medium">{t.description}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{t.itemCode}</div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusPill status={t.status === "in-transit" ? "in-progress" : t.status === "received" ? "approved" : t.status === "cancelled" ? "rejected" : t.status === "draft" ? "draft" : "pending"} />
                  <RowActions
                    onEdit={() => openEdit("transfers", t as unknown as Record<string, unknown>, "Edit Transfer")}
                    onDelete={() => askDelete("transfers", t.id, t.code)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">From</div>
                  <div className="font-mono text-xs">{t.fromStore}</div>
                </div>
                <div className="flex-1 mx-3 flex items-center gap-2 text-muted-foreground">
                  <div className="flex-1 border-t border-dashed" />
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="font-mono text-xs">{t.qty > 0 ? "+" : ""}{t.qty} {t.uom}</span>
                  <div className="flex-1 border-t border-dashed" />
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">To</div>
                  <div className="font-mono text-xs">{t.toStore ?? "—"}</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <div>{t.requestedBy} · {shortDate(t.createdAt)}</div>
                <div className="truncate max-w-[60%] text-right">{t.reason}</div>
              </div>

              {(t.status === "draft" || t.status === "requested" || t.status === "in-transit") && (
                <div className="flex gap-2">
                  {t.status === "draft" && (
                    <Button size="sm" variant="outline" className="flex-1"
                      onClick={() => { setTransferStatus(t.id, "requested"); toast.success(`${t.code} submitted`); }}>Submit</Button>
                  )}
                  {t.status === "requested" && (
                    <Button size="sm" variant="outline" className="flex-1"
                      onClick={() => { setTransferStatus(t.id, "in-transit"); toast.success(`${t.code} dispatched`); }}>Dispatch</Button>
                  )}
                  {t.status === "in-transit" && (
                    <Button size="sm" className="flex-1 gap-1"
                      onClick={() => { setTransferStatus(t.id, "received"); toast.success(`${t.code} received`); }}>
                      <CheckCircle2 className="h-4 w-4" />Receive
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1"
                    onClick={() => { setTransferStatus(t.id, "cancelled"); toast.success(`${t.code} cancelled`); }}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!rows.length && <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No transfers.</div>}
      </div>
      {dialogs}
    </div>
  );
}

/* ============== CYCLE COUNT ============== */
function CountsView() {
  const counts = useInventory((s) => s.counts);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const lookups = useInventoryOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(INVENTORY_SCHEMAS, upsertInventory, deleteInventory, lookups);


  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return counts.filter((c) => (status === "all" || c.status === status)
      && (!q || [c.code, c.storeName, c.auditor].some((x) => x.toLowerCase().includes(l))));
  }, [counts, q, status]);

  const filters = ["all", "planned", "in-progress", "reconciled", "posted"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Cycle Count & Reconciliation" description="Scheduled counts with progress tracking, variance analysis and posting to inventory." q={q} setQ={setQ} newLabel="New Count"
        onExport={() => exportCsv("cycle-counts", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("counts", "Schedule Cycle Count", { status: "planned", itemsPlanned: 0, itemsCounted: 0, variancesFound: 0, varianceValue: 0, variancePct: 0, scheduledFor: new Date().toISOString() })} />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {f.replace("-", " ")} <span className="ml-1 text-[10px] opacity-60">{f === "all" ? counts.length : counts.filter((c) => c.status === f).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((c) => {
          const pct = c.itemsPlanned ? Math.round((c.itemsCounted / c.itemsPlanned) * 100) : 0;
          return (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                      <StatusPill status={c.status === "in-progress" ? "in-progress" : c.status === "reconciled" ? "approved" : c.status === "posted" ? "done" : "upcoming"} />
                    </div>
                    <div className="mt-1 font-medium flex items-center gap-2"><Package className="h-4 w-4 text-primary" />{c.storeName}</div>
                    <div className="text-xs text-muted-foreground">{shortDate(c.scheduledFor)} · Auditor {c.auditor}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Variance</div>
                    <div className="font-display text-lg font-semibold">{fmtCompact(c.varianceValue)}</div>
                    <div className="text-xs text-muted-foreground">{c.variancesFound} items · {c.variancePct}%</div>
                  </div>
                  <RowActions
                    onEdit={() => openEdit("counts", c as unknown as Record<string, unknown>, "Edit Cycle Count")}
                    onDelete={() => askDelete("counts", c.id, c.code)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Counted {c.itemsCounted} / {c.itemsPlanned}</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>

                {(c.status === "in-progress" || c.status === "reconciled") && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1"
                      onClick={() => openEdit("counts", c as unknown as Record<string, unknown>, "Adjust Cycle Count")}>Adjust</Button>
                    <Button size="sm" className="flex-1 gap-1"
                      onClick={() => { postCycleCount(c.id); toast.success(`${c.code} posted to inventory`); }}>
                      <CheckCircle2 className="h-4 w-4" />Post
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!rows.length && <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No cycle counts.</div>}
      </div>
      {dialogs}
    </div>
  );
}
