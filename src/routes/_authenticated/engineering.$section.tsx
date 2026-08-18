import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Plus, Download, Upload, FileText, ChevronDown, ChevronRight, GripVertical, CornerDownRight, Pencil, Trash2,
} from "lucide-react";
import { usePlm, moveBomNode, upsertPlm, deletePlm } from "@/lib/plm/store";
import { PLM_SCHEMAS } from "@/lib/plm/schemas";
import { StatusPill } from "@/components/projects/shared";
import { RowActions, useCrud } from "@/components/crud-kit";
import { exportCsv } from "@/lib/crud";
import type { BomNode } from "@/lib/plm/types";
import { useEngineeringOptions } from "@/lib/plm/options";
import { DesignDocuments } from "@/components/engineering/design-docs";
import { WorkOrders } from "@/components/engineering/work-orders";
import { ProjectCost360View } from "@/components/engineering/cost-360";
import { BomSourcingPanel } from "@/components/engineering/bom-sourcing";
import { BomImportDialog, BomImportHistory } from "@/components/engineering/bom-import-dialog";


export const Route = createFileRoute("/_authenticated/engineering/$section")({
  head: () => ({ meta: [{ title: "Engineering · Faith Automation ERP" }] }),
  component: SectionView,
  notFoundComponent: () => (
    <div className="p-12 text-center text-sm text-muted-foreground">Section not found.</div>
  ),
});

const VALID = new Set(["items", "parts", "design", "drawings", "ebom", "mbom", "ecns", "ecrs", "reviews", "workorders", "cost"]);

function SectionView() {
  const { section } = Route.useParams();
  if (!VALID.has(section)) throw notFound();
  if (section === "design") return <DesignDocuments />;
  if (section === "workorders") return <WorkOrders />;
  if (section === "cost") return <ProjectCost360View />;
  if (section === "ebom") return <BomView kind="EBOM" />;
  if (section === "mbom") return <BomView kind="MBOM" />;
  return <ListView key={section} section={section} />;
}

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const NEW_DEFAULTS: Record<string, Record<string, unknown>> = {
  items: { rev: "A", uom: "EA", type: "Component", make_buy: "Buy", lifecycle: "Prototype", stdCost: 0 },
  parts: { rev: "A", category: "Mechanical" },
  drawings: { rev: "A", format: "2D-PDF", status: "In Work", size: "1.0 MB", releasedAt: new Date().toISOString() },
  ecns: { fromRev: "A", toRev: "B", status: "draft", effectivity: new Date().toISOString() },
  ecrs: { priority: "Medium", status: "draft" },
  reviews: { outcome: "Pending", actions: 0, scheduled: new Date().toISOString() },
};

function ListView({ section }: { section: string }) {
  const s = usePlm((s) => s);
  const [q, setQ] = useState("");
  const engOptions = useEngineeringOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(PLM_SCHEMAS, upsertPlm, deletePlm, engOptions);

  const config: Record<string, { title: string; description: string; singular: string }> = {
    items: { title: "Item Master", description: "Every material, component and assembly used across products.", singular: "Item" },
    parts: { title: "Part Master", description: "Purchasable, off-the-shelf parts with supplier & material data.", singular: "Part" },
    drawings: { title: "Drawing Repository", description: "2D & 3D CAD deliverables with revision & release status.", singular: "Drawing" },
    ecns: { title: "Engineering Change Notices", description: "Formal notifications of design changes with effectivity.", singular: "ECN" },
    ecrs: { title: "Engineering Change Requests", description: "Proposals for design changes pending evaluation.", singular: "ECR" },
    reviews: { title: "Design Reviews", description: "Formal engineering gate reviews with outcomes & actions.", singular: "Design Review" },
  };
  const cfg = config[section];

  const rows = useMemo(() => {
    const lower = q.toLowerCase();
    const match = (v: unknown) => String(v).toLowerCase().includes(lower);
    if (section === "items") return s.items.filter((i) => !q || match(i.code) || match(i.name) || match(i.type));
    if (section === "parts") return s.parts.filter((i) => !q || match(i.code) || match(i.name) || match(i.category));
    if (section === "drawings") return s.drawings.filter((i) => !q || match(i.number) || match(i.title));
    if (section === "ecns") return s.ecns.filter((i) => !q || match(i.code) || match(i.title) || match(i.itemCode));
    if (section === "ecrs") return s.ecrs.filter((i) => !q || match(i.code) || match(i.title) || match(i.itemCode));
    if (section === "reviews") return s.reviews.filter((i) => !q || match(i.code) || match(i.title));
    return [];
  }, [section, q, s]);

  const edit = (rec: Record<string, unknown>) => {
    const seedRec = section === "reviews"
      ? { ...rec, reviewersText: ((rec.reviewers as string[]) ?? []).join(", ") }
      : rec;
    openEdit(section, seedRec, `Edit ${cfg.singular}`);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{cfg.title}</h2>
          <p className="text-sm text-muted-foreground">{cfg.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-64 pl-8" />
          </div>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportCsv(section, rows as unknown as Array<Record<string, unknown>>)}>
            <Download className="h-4 w-4" />Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => openNew(section, `New ${cfg.singular}`, NEW_DEFAULTS[section])}>
            <Plus className="h-4 w-4" />New
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {section === "items" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">UoM</th><th className="p-3 text-left">Rev</th><th className="p-3 text-right">Std Cost</th><th className="p-3 text-left">Make/Buy</th><th className="p-3 text-left">Lifecycle</th><th className="p-3 w-12"></th></tr>
              </thead>
              <tbody className="divide-y">
                {(rows as typeof s.items).map((i) => (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{i.code}</td>
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3"><Badge variant="outline">{i.type}</Badge></td>
                    <td className="p-3 font-mono text-xs">{i.uom}</td>
                    <td className="p-3 font-mono"><Badge variant="secondary">Rev {i.rev}</Badge></td>
                    <td className="p-3 text-right font-mono">{fmtINR(i.stdCost)}</td>
                    <td className="p-3">{i.make_buy}</td>
                    <td className="p-3"><StatusPill status={i.lifecycle === "Production" ? "achieved" : i.lifecycle === "Prototype" ? "in-progress" : "closed"} /></td>
                    <td className="p-3 text-right">
                      <RowActions onEdit={() => edit(i as unknown as Record<string, unknown>)} onDelete={() => askDelete(section, i.id, i.name)} />
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">No items.</td></tr>}
              </tbody>
            </table>
          )}
          {section === "parts" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Supplier</th><th className="p-3 text-left">Material</th><th className="p-3 text-right">Weight</th><th className="p-3 text-left">Rev</th><th className="p-3 w-12"></th></tr>
              </thead>
              <tbody className="divide-y">
                {(rows as typeof s.parts).map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{p.code}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3"><Badge variant="outline">{p.category}</Badge></td>
                    <td className="p-3">{p.supplier ?? "—"}</td>
                    <td className="p-3">{p.material ?? "—"}</td>
                    <td className="p-3 text-right font-mono">{p.weight ? `${p.weight} kg` : "—"}</td>
                    <td className="p-3"><Badge variant="secondary">Rev {p.rev}</Badge></td>
                    <td className="p-3 text-right">
                      <RowActions onEdit={() => edit(p as unknown as Record<string, unknown>)} onDelete={() => askDelete(section, p.id, p.name)} />
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No parts.</td></tr>}
              </tbody>
            </table>
          )}
          {section === "drawings" && (
            <div className="divide-y">
              {(rows as typeof s.drawings).map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{d.number}</span>
                      <Badge variant="secondary">Rev {d.rev}</Badge>
                      <Badge variant="outline">{d.format}</Badge>
                    </div>
                    <div className="truncate text-sm font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.itemCode} · {d.size} · {d.uploadedBy}</div>
                  </div>
                  <StatusPill status={d.status === "Released" ? "achieved" : d.status === "Under Review" ? "pending" : d.status === "Obsolete" ? "closed" : "in-progress"} />
                  <RowActions onEdit={() => edit(d as unknown as Record<string, unknown>)} onDelete={() => askDelete(section, d.id, d.number)} />
                </div>
              ))}
              {!rows.length && <div className="p-8 text-center text-sm text-muted-foreground">No drawings.</div>}
            </div>
          )}
          {section === "ecns" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Title</th><th className="p-3 text-left">Item</th><th className="p-3 text-left">Revision</th><th className="p-3 text-left">Reason</th><th className="p-3 text-left">Effectivity</th><th className="p-3 text-left">Status</th><th className="p-3 w-12"></th></tr>
              </thead>
              <tbody className="divide-y">
                {(rows as typeof s.ecns).map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{e.code}</td>
                    <td className="p-3 font-medium">{e.title}</td>
                    <td className="p-3 font-mono text-xs">{e.itemCode}</td>
                    <td className="p-3"><Badge variant="secondary">{e.fromRev} → {e.toRev}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{e.reason}</td>
                    <td className="p-3 text-xs">{new Date(e.effectivity).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                    <td className="p-3"><StatusPill status={e.status === "released" ? "achieved" : e.status} /></td>
                    <td className="p-3 text-right">
                      <RowActions onEdit={() => edit(e as unknown as Record<string, unknown>)} onDelete={() => askDelete(section, e.id, e.code)} />
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No change notices.</td></tr>}
              </tbody>
            </table>
          )}
          {section === "ecrs" && (
            <div className="divide-y">
              {(rows as typeof s.ecrs).map((r) => (
                <div key={r.id} className="p-4 hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                        <Badge variant="outline">{r.priority}</Badge>
                        {r.linkedEcn && <Badge variant="secondary">Linked {r.linkedEcn}</Badge>}
                      </div>
                      <div className="mt-0.5 font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">Item {r.itemCode} · Raised by {r.raisedBy}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusPill status={r.status === "under-review" ? "in-progress" : r.status === "converted" ? "achieved" : r.status} />
                      <RowActions onEdit={() => edit(r as unknown as Record<string, unknown>)} onDelete={() => askDelete(section, r.id, r.code)} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                </div>
              ))}
              {!rows.length && <div className="p-8 text-center text-sm text-muted-foreground">No change requests.</div>}
            </div>
          )}
          {section === "reviews" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Title</th><th className="p-3 text-left">Item</th><th className="p-3 text-left">Reviewers</th><th className="p-3 text-left">Scheduled</th><th className="p-3 text-left">Actions</th><th className="p-3 text-left">Outcome</th><th className="p-3 w-12"></th></tr>
              </thead>
              <tbody className="divide-y">
                {(rows as typeof s.reviews).map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.code}</td>
                    <td className="p-3 font-medium">{r.title}</td>
                    <td className="p-3 font-mono text-xs">{r.itemCode}</td>
                    <td className="p-3 text-xs">{(r.reviewers ?? []).join(", ")}</td>
                    <td className="p-3 text-xs">{new Date(r.scheduled).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                    <td className="p-3 text-center">{r.actions}</td>
                    <td className="p-3">{r.outcome}</td>
                    <td className="p-3 text-right">
                      <RowActions onEdit={() => edit(r as unknown as Record<string, unknown>)} onDelete={() => askDelete(section, r.id, r.code)} />
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No design reviews.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {dialogs}
    </div>
  );
}

/* ==================== BOM ==================== */

function BomView({ kind }: { kind: "EBOM" | "MBOM" }) {
  const s = usePlm((st) => st);
  const nodes = s.bom.filter((n) => n.kind === kind);
  const roots = nodes.filter((n) => !n.parentId);
  const [selectedRootId, setSelectedRootId] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const engOptions = useEngineeringOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(PLM_SCHEMAS, upsertPlm, deletePlm, engOptions);


  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const activeRoot = nodes.find((n) => n.id === selectedRootId) ?? roots[0];
  const treeNodes = nodes.filter((n) => n.rootId === activeRoot?.id);

  const stats = (() => {
    let items = 0, buy = 0, make = 0;
    treeNodes.forEach((n) => { items++; if (n.procurement === "Buy") buy++; else if (n.procurement === "Make") make++; });
    return { items, buy, make, levels: maxDepth(treeNodes, activeRoot?.id) };
  })();

  const addTopAssembly = () =>
    openNew("bom", `New ${kind} Top Assembly`, { kind, qty: 1, uom: "EA", rev: "A", procurement: "Make" });

  const addChild = (parent: BomNode) =>
    openNew("bom", `Add Component under ${parent.itemCode}`, {
      kind,
      parentId: parent.id,
      rootId: parent.rootId,
      qty: 1,
      uom: parent.uom,
      rev: parent.rev,
      procurement: "Buy",
    });

  const editNode = (n: BomNode) => openEdit("bom", n as unknown as Record<string, unknown>, `Edit ${n.itemCode}`);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            {kind === "EBOM" ? "Engineering BOM" : "Manufacturing BOM"}
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Multi-level · Drag & drop</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            {kind === "EBOM"
              ? "As-designed product structure straight from CAD."
              : "As-built structure with process routing and phantom operations."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportCsv(`${kind}-${activeRoot?.itemCode ?? "bom"}`, treeNodes as unknown as Array<Record<string, unknown>>)}>
            <Download className="h-4 w-4" />Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />Import BOM
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={addTopAssembly}>
            <Plus className="h-4 w-4" />Top Assembly
          </Button>

          <Button size="sm" className="gap-2" disabled={!activeRoot} onClick={() => activeRoot && addChild(activeRoot)}>
            <Plus className="h-4 w-4" />Add Component
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Root list */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Assemblies</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {roots.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-1 pr-2 hover:bg-muted/40 ${activeRoot?.id === r.id ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                >
                  <button onClick={() => setSelectedRootId(r.id)} className="min-w-0 flex-1 p-3 text-left text-sm">
                    <div className="font-mono text-xs text-muted-foreground">{r.itemCode}</div>
                    <div className="truncate font-medium">{r.itemName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Rev {r.rev}{r.projectCode ? ` · ${r.projectCode}` : ""}</div>
                  </button>
                  <RowActions onEdit={() => editNode(r)} onDelete={() => askDelete("bom", r.id, r.itemCode)} />
                </div>
              ))}
              {!roots.length && <div className="p-6 text-center text-xs text-muted-foreground">No assemblies yet.</div>}
            </div>
          </CardContent>
        </Card>

        {/* Tree */}
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[
              ["Total Items", stats.items],
              ["Depth", stats.levels],
              ["Make Items", stats.make],
              ["Buy Items", stats.buy],
            ].map(([l, v]) => (
              <Card key={l as string}>
                <CardContent className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                  <div className="mt-0.5 font-display text-xl font-semibold">{v}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-[minmax(260px,1.6fr)_90px_80px_70px_110px_110px] gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div>Item</div><div>Qty</div><div>UoM</div><div>Rev</div><div>Sourcing</div><div className="text-right">Actions</div>
              </div>
              <div className="p-2 text-xs text-muted-foreground italic border-b bg-muted/10">
                Drag any row onto a parent assembly to re-parent. Use the row buttons to add sub-components, edit quantities or delete lines.
              </div>
              <div className="divide-y">
                {activeRoot ? (
                  <BomRow
                    node={activeRoot}
                    nodes={treeNodes}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggle}
                    dragId={dragId}
                    overId={overId}
                    setDragId={setDragId}
                    setOverId={setOverId}
                    onAddChild={addChild}
                    onEdit={editNode}
                    onDelete={(n) => askDelete("bom", n.id, n.itemCode)}
                  />
                ) : (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    No BOM structure yet — start with a top assembly.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {activeRoot && <BomSourcingPanel rootId={activeRoot.id} kind={kind} />}
          <BomImportHistory kind={kind} />
        </div>
      </div>
      <BomImportDialog
        kind={kind}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(rootId) => setSelectedRootId(rootId)}
      />
      {dialogs}
    </div>

  );
}

function maxDepth(nodes: { id: string; parentId?: string }[], rootId?: string): number {
  if (!rootId) return 0;
  const walk = (id: string): number => {
    const children = nodes.filter((c) => c.parentId === id);
    if (!children.length) return 0;
    return 1 + Math.max(...children.map((c) => walk(c.id)));
  };
  return walk(rootId) + 1;
}

interface BomRowProps {
  node: BomNode;
  nodes: BomNode[];
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  dragId: string | null;
  overId: string | null;
  setDragId: (id: string | null) => void;
  setOverId: (id: string | null) => void;
  onAddChild: (node: BomNode) => void;
  onEdit: (node: BomNode) => void;
  onDelete: (node: BomNode) => void;
}

function BomRow({
  node, nodes, depth, expanded, onToggle, dragId, overId, setDragId, setOverId,
  onAddChild, onEdit, onDelete,
}: BomRowProps) {
  const children = nodes.filter((c) => c.parentId === node.id);
  const isOpen = depth === 0 ? true : expanded[node.id] !== false;
  const hasChildren = children.length > 0;
  const isRoot = depth === 0;

  return (
    <>
      <div
        draggable={!isRoot}
        onDragStart={(e) => {
          if (isRoot) return;
          setDragId(node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (dragId && dragId !== node.id) {
            e.preventDefault();
            setOverId(node.id);
          }
        }}
        onDragLeave={() => overId === node.id && setOverId(null)}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && dragId !== node.id) {
            moveBomNode(dragId, node.id);
          }
          setDragId(null);
          setOverId(null);
        }}
        onDragEnd={() => { setDragId(null); setOverId(null); }}
        className={`grid grid-cols-[minmax(260px,1.6fr)_90px_80px_70px_110px_110px] items-center gap-2 px-4 py-2 text-sm hover:bg-muted/30 ${
          overId === node.id ? "bg-primary/10 ring-1 ring-inset ring-primary" : ""
        } ${dragId === node.id ? "opacity-40" : ""} ${isRoot ? "bg-muted/20 font-semibold" : ""}`}
      >
        <div className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: depth * 20 }}>
          {!isRoot && <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground cursor-grab" />}
          {hasChildren ? (
            <button onClick={() => onToggle(node.id)} className="grid h-4 w-4 place-items-center rounded hover:bg-muted">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className="font-mono text-xs text-muted-foreground">{node.itemCode}</span>
          <span className="truncate">{node.itemName}</span>
        </div>
        <div className="font-mono text-xs">{node.qty}</div>
        <div className="font-mono text-xs">{node.uom}</div>
        <div><Badge variant="secondary" className="text-[10px]">{node.rev}</Badge></div>
        <div>
          {node.procurement ? (
            <Badge variant={node.procurement === "Buy" ? "outline" : "secondary"} className="text-[10px]">{node.procurement}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Add sub-component" onClick={() => onAddChild(node)}>
            <CornerDownRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit line" onClick={() => onEdit(node)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete line" onClick={() => onDelete(node)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {isOpen && children.map((c) => (
        <BomRow
          key={c.id}
          node={c}
          nodes={nodes}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          dragId={dragId}
          overId={overId}
          setDragId={setDragId}
          setOverId={setOverId}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}
