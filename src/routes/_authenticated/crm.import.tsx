import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, FileSpreadsheet, ScanText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtINR } from "@/components/crm/shared";
import { commitParsedPo, parsePoFile, parsePoText, type ParsedPo } from "@/lib/crm/po-import";

export const Route = createFileRoute("/_authenticated/crm/import")({
  head: () => ({
    meta: [
      { title: "Customer PO Import · Revenue Lifecycle · Faith Automation" },
      {
        name: "description",
        content:
          "Import customer purchase orders from Excel, CSV or scanned OCR text and convert them into Order Acceptance with matched line items.",
      },
      { property: "og:title", content: "Customer PO Import" },
      { property: "og:description", content: "Excel and OCR-based purchase order import with AI item matching." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PoImportPage,
});

function PoImportPage() {
  const [parsed, setParsed] = useState<ParsedPo | null>(null);
  const [ocr, setOcr] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      setParsed(await parsePoFile(file));
      toast.success(`${file.name} parsed`);
    } catch {
      toast.error("Could not read that file — use .xlsx, .xls or .csv");
    } finally {
      setBusy(false);
    }
  };

  const commit = () => {
    if (!parsed) return;
    if (!parsed.customerName) {
      toast.error("Set the customer before importing");
      return;
    }
    commitParsedPo(parsed);
    toast.success("Order Acceptance created with imported line items");
    setParsed(null);
    setOcr("");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import a customer purchase order</CardTitle>
          <p className="text-xs text-muted-foreground">
            Line items are matched against the item master, priced automatically and carried into the Order
            Acceptance — no re-keying.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="excel">
            <TabsList>
              <TabsTrigger value="excel" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Excel / CSV
              </TabsTrigger>
              <TabsTrigger value="ocr" className="gap-2">
                <ScanText className="h-4 w-4" /> Scanned PO (OCR text)
              </TabsTrigger>
            </TabsList>
            <TabsContent value="excel" className="pt-4">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center hover:bg-muted/40">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">{busy ? "Reading…" : "Choose an .xlsx, .xls or .csv PO"}</span>
                <span className="text-xs text-muted-foreground">
                  Header row should contain Description, Qty, Rate, UOM
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
            </TabsContent>
            <TabsContent value="ocr" className="space-y-3 pt-4">
              <Label className="text-xs">Paste the OCR / extracted text from the scanned PO</Label>
              <Textarea
                rows={8}
                value={ocr}
                placeholder={"PO No: FA/2026/0118\nCustomer: Tata Motors\n1  Robot welding cell  2 Nos  4500000"}
                onChange={(e) => setOcr(e.target.value)}
              />
              <Button onClick={() => setParsed(parsePoText(ocr))} disabled={!ocr.trim()}>
                Extract line items
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {parsed && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">Review extracted order</CardTitle>
              <p className="text-xs text-muted-foreground">Source: {parsed.source.toUpperCase()}</p>
            </div>
            <Button onClick={commit}>Create Order Acceptance</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Customer</Label>
                <Input
                  value={parsed.customerName}
                  onChange={(e) => setParsed({ ...parsed, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">PO number</Label>
                <Input value={parsed.poNumber} onChange={(e) => setParsed({ ...parsed, poNumber: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={parsed.title} onChange={(e) => setParsed({ ...parsed, title: e.target.value })} />
              </div>
            </div>

            {parsed.warnings.map((w) => (
              <p key={w} className="flex gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
              </p>
            ))}
            {!parsed.warnings.length && (
              <p className="flex gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> All lines matched cleanly.
              </p>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>AI match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.lines.map((l, i) => (
                    <TableRow key={`${l.description}-${i}`}>
                      <TableCell>{l.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {l.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{l.qty}</TableCell>
                      <TableCell>{l.uom}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(l.rate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(l.qty * l.rate)}</TableCell>
                      <TableCell className="text-xs">
                        {l.matchedItemCode ? (
                          <span className="font-mono">
                            {l.matchedItemCode}{" "}
                            <span className="text-muted-foreground">({l.matchConfidence}%)</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">new item</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
