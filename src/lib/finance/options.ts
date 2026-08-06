import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { useFinance } from "./store";
import { useCrm } from "@/lib/crm/store";
import { useProcurement } from "@/lib/procurement/store";
import { useProjectsStore } from "@/lib/projects/store";

/** Searchable lookups shared by every finance sub-module form. */
export function useFinanceOptions(): Record<string, ComboOption[]> {
  const accounts = useFinance((s) => s.accounts);
  const arInvoices = useFinance((s) => s.arInvoices);
  const apBills = useFinance((s) => s.apBills);
  const banks = useFinance((s) => s.bankAccounts);
  const costs = useFinance((s) => s.projectCosts);
  const customers = useCrm((s) => s.customers);
  const vendors = useProcurement((s) => s.vendors);
  const pos = useProcurement((s) => s.pos);
  const grns = useProcurement((s) => s.grns);
  const projects = useProjectsStore((s) => s.projects);

  return useMemo(() => {
    const projectOpts = new Map<string, ComboOption>();
    projects.forEach((p) =>
      projectOpts.set(p.code, { value: p.code, label: p.code, hint: `${p.name} · ${p.customerName}` }),
    );
    costs.forEach((c) => {
      if (!projectOpts.has(c.projectCode))
        projectOpts.set(c.projectCode, { value: c.projectCode, label: c.projectCode, hint: `${c.projectName} · ${c.customer}` });
    });

    const customerOpts = new Map<string, ComboOption>();
    customers.forEach((c) => customerOpts.set(c.name, { value: c.name, label: c.name, hint: `${c.code} · ${c.segment}` }));
    arInvoices.forEach((i) => {
      if (!customerOpts.has(i.customerName)) customerOpts.set(i.customerName, { value: i.customerName, label: i.customerName });
    });

    const vendorOpts = new Map<string, ComboOption>();
    vendors.forEach((v) => vendorOpts.set(v.name, { value: v.name, label: v.name, hint: `${v.code} · ${v.category}` }));
    apBills.forEach((b) => {
      if (!vendorOpts.has(b.vendorName)) vendorOpts.set(b.vendorName, { value: b.vendorName, label: b.vendorName });
    });

    return {
      accounts: accounts.map((a) => ({ value: a.code, label: a.code, hint: `${a.name} · ${a.type}` })),
      projects: Array.from(projectOpts.values()),
      customers: Array.from(customerOpts.values()),
      vendors: Array.from(vendorOpts.values()),
      banks: banks.map((b) => ({ value: b.code, label: b.code, hint: `${b.bankName} · ${b.accountNo}` })),
      pos: pos.map((p) => ({ value: p.code, label: p.code, hint: `${p.vendorName}` })),
      grns: grns.map((g) => ({ value: g.code, label: g.code, hint: `${g.vendorName ?? ""} ${g.poCode ?? ""}`.trim() })),
      openDocs: [
        ...arInvoices.map((i) => ({ value: i.code, label: i.code, hint: `AR · ${i.customerName}` })),
        ...apBills.map((b) => ({ value: b.code, label: b.code, hint: `AP · ${b.vendorName}` })),
      ],
    };
  }, [accounts, arInvoices, apBills, banks, costs, customers, vendors, pos, grns, projects]);
}
