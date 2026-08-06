import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { useGst } from "./store";
import { useFinance } from "@/lib/finance/store";
import { useProcurement } from "@/lib/procurement/store";

/** Searchable lookups shared by every GST sub-module form. */
export function useGstOptions(): Record<string, ComboOption[]> {
  const registrations = useGst((s) => s.registrations);
  const eInvoices = useGst((s) => s.eInvoices);
  const hsn = useGst((s) => s.hsn);
  const itc = useGst((s) => s.itc);
  const arInvoices = useFinance((s) => s.arInvoices);
  const vendors = useProcurement((s) => s.vendors);

  return useMemo(() => {
    const customers = Array.from(
      new Set([...eInvoices.map((e) => e.customer), ...arInvoices.map((i) => i.customerName)]),
    ).filter(Boolean);

    const suppliers = Array.from(
      new Set([...itc.map((i) => i.supplier), ...vendors.map((v) => v.name)]),
    ).filter(Boolean);

    return {
      gstins: registrations.map((r) => ({
        value: r.gstin,
        label: r.gstin,
        hint: `${r.tradeName} · ${r.state}`,
      })),
      customers: customers.map((c) => {
        const gstin = eInvoices.find((e) => e.customer === c)?.gstin;
        return { value: c, label: c, ...(gstin ? { hint: gstin, patch: { gstin } } : {}) };
      }),
      suppliers: suppliers.map((sName) => {
        const gstin = itc.find((i) => i.supplier === sName)?.gstin;
        return { value: sName, label: sName, ...(gstin ? { hint: gstin, patch: { gstin } } : {}) };
      }),
      invoices: eInvoices.map((e) => ({
        value: e.invoiceNo,
        label: e.invoiceNo,
        hint: `${e.customer} · ₹${Math.round(e.taxableValue).toLocaleString("en-IN")}`,
      })),
      hsnCodes: hsn.map((h) => ({
        value: h.hsn,
        label: h.hsn,
        hint: h.description,
        patch: { description: h.description, uom: h.uom },
      })),
    };
  }, [registrations, eInvoices, hsn, itc, arInvoices, vendors]);
}
