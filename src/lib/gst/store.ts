import { useSyncExternalStore } from "react";
import { makeCrud } from "@/lib/crud";
import type { GstState } from "./types";

const KEY = "faith-erp:gst:v1";

function id(p: string, n: number) {
  return `${p}-${String(n).padStart(3, "0")}`;
}

function seed(): GstState {
  const periods = ["2024-04", "2024-05", "2024-06", "2024-07", "2024-08", "2024-09"];
  const returns: GstState["returns"] = [];
  let n = 0;
  for (const p of periods) {
    for (const t of ["GSTR-1", "GSTR-3B", "GSTR-2B"] as const) {
      n += 1;
      const idx = periods.indexOf(p);
      const isLatest = idx >= periods.length - 1;
      const taxable = 18500000 + idx * 1450000 + (t === "GSTR-2B" ? -6200000 : 0);
      const igst = Math.round(taxable * 0.11);
      const half = Math.round(taxable * 0.035);
      returns.push({
        id: id("RET", n),
        gstin: "27AAFCF1234M1ZP",
        period: p,
        type: t,
        dueDate: `${p}-${t === "GSTR-1" ? "11" : t === "GSTR-3B" ? "20" : "14"}`,
        filedOn: isLatest ? undefined : `${p}-${t === "GSTR-1" ? "09" : "18"}`,
        status: isLatest ? (t === "GSTR-2B" ? "ready" : "in-progress") : "filed",
        taxableValue: taxable,
        igst,
        cgst: half,
        sgst: half,
        cess: 0,
        arn: isLatest ? undefined : `AA27${p.replace("-", "")}${n}Z`,
      });
    }
  }

  const customers = [
    ["Tata Motors Ltd", "27AAACT2727Q1ZW", "Pune"],
    ["Mahindra & Mahindra", "27AAACM3025E1ZL", "Nashik"],
    ["Ashok Leyland", "33AAACA1103L1Z6", "Hosur"],
    ["Bajaj Auto Ltd", "27AABCB2971R1Z0", "Chakan"],
    ["JBM Auto Ltd", "06AAACJ4712N1ZB", "Gurugram"],
    ["Force Motors", "27AAACB5307E1ZG", "Pithampur"],
  ];

  const eInvoices: GstState["eInvoices"] = customers.flatMap((c, i) =>
    [0, 1].map((k) => {
      const seqn = i * 2 + k + 1;
      const taxable = 1250000 + seqn * 187500;
      const failed = seqn === 7;
      const pending = seqn >= 11;
      return {
        id: id("EIN", seqn),
        invoiceNo: `INV/FA/24-${String(1100 + seqn)}`,
        date: `2024-09-${String(3 + seqn).padStart(2, "0")}`,
        customer: c[0],
        gstin: c[1],
        taxableValue: taxable,
        totalTax: Math.round(taxable * 0.18),
        irn: failed || pending ? undefined : `${seqn}f4a91c8de7b2${seqn}0a55c1e93b6d7f48a2${seqn}c0b91e7d5`,
        ackNo: failed || pending ? undefined : `1120${String(240000 + seqn)}`,
        status: failed ? "failed" : pending ? "pending" : "generated",
        errorMsg: failed ? "2172 : Duplicate IRN request for the document" : undefined,
      } as GstState["eInvoices"][number];
    }),
  );

  const eWayBills: GstState["eWayBills"] = customers.map((c, i) => ({
    id: id("EWB", i + 1),
    ewbNo: `4210 ${String(3391 + i)} ${String(7742 + i * 13)}`,
    invoiceNo: `INV/FA/24-${String(1101 + i * 2)}`,
    date: `2024-09-${String(4 + i * 2).padStart(2, "0")}`,
    fromPlace: "Chakan, Pune",
    toPlace: c[2],
    distanceKm: 45 + i * 137,
    vehicleNo: `MH12 ${["QR", "AB", "KL", "ZX", "TR", "PN"][i]} ${String(4021 + i * 7)}`,
    transporter: ["VRL Logistics", "TCI Freight", "Safexpress", "VRL Logistics", "Gati KWE", "TCI Freight"][i],
    validUpto: `2024-09-${String(6 + i * 2).padStart(2, "0")}`,
    value: 1475000 + i * 221250,
    status: i === 5 ? "expired" : i === 4 ? "cancelled" : "active",
  }));

  const suppliers = [
    ["Tata Steel Ltd", "27AAACT3520P1ZR"],
    ["Jindal Stainless", "06AAACJ4323N1Z8"],
    ["SKF India Ltd", "27AAACS0304K1Z6"],
    ["Festo India Pvt Ltd", "29AAACF1234H1ZQ"],
    ["SMC Pneumatics", "27AAACS8891J1ZF"],
    ["Bosch Rexroth India", "27AAACB1266L1Z1"],
    ["Igus India", "27AABCI5501M1ZK"],
    ["Misumi India", "06AAFCM9903Q1ZD"],
  ];

  const itc: GstState["itc"] = suppliers.map((s, i) => {
    const book = 385000 + i * 74500;
    const variance = i === 2 ? -18000 : i === 5 ? 24500 : 0;
    const missing2b = i === 6;
    const missingBooks = i === 7;
    return {
      id: id("ITC", i + 1),
      supplier: s[0],
      gstin: s[1],
      invoiceNo: `PI/${1200 + i * 9}/24-25`,
      date: `2024-09-${String(2 + i * 3).padStart(2, "0")}`,
      bookValue: missingBooks ? 0 : book,
      gstr2bValue: missing2b ? 0 : book + variance,
      itcClaimable: missing2b || missingBooks ? 0 : Math.round((book + Math.min(0, variance)) * 0.18),
      match: missing2b ? "missing-in-2b" : missingBooks ? "missing-in-books" : variance ? "mismatch" : "matched",
    };
  });

  const hsnRows = [
    ["72085190", "Hot-rolled steel plate, thickness > 10mm", "KG", 148500, 21450000, 18],
    ["73269099", "Fabricated BIW fixture assemblies", "EA", 412, 39640000, 18],
    ["84799090", "Automation cell parts & accessories", "EA", 1875, 14212000, 18],
    ["85371000", "Control panels & PLC enclosures", "EA", 96, 8640000, 18],
    ["84212300", "Pneumatic filter regulator units", "EA", 640, 2560000, 18],
    ["73181500", "High-tensile fasteners", "KG", 8400, 1428000, 18],
    ["998873", "Job work — machining & welding services", "LOT", 58, 6960000, 12],
  ] as const;

  const hsn: GstState["hsn"] = hsnRows.map((r, i) => {
    const taxable = r[4] as number;
    const rate = r[5] as number;
    const igst = Math.round(taxable * (rate / 100) * 0.62);
    const half = Math.round((taxable * (rate / 100) - igst) / 2);
    return {
      id: id("HSN", i + 1),
      hsn: r[0],
      description: r[1],
      uom: r[2],
      qty: r[3] as number,
      taxableValue: taxable,
      rate,
      igst,
      cgst: half,
      sgst: half,
    };
  });

  return {
    registrations: [
      {
        id: "REG-001",
        gstin: "27AAFCF1234M1ZP",
        legalName: "Faith Automation India Pvt Ltd",
        tradeName: "Faith Automation",
        state: "Maharashtra",
        type: "Regular",
        registeredOn: "2017-07-01",
        status: "active",
        primary: true,
      },
      {
        id: "REG-002",
        gstin: "29AAFCF1234M1ZL",
        legalName: "Faith Automation India Pvt Ltd",
        tradeName: "Faith Automation — Bengaluru",
        state: "Karnataka",
        type: "Regular",
        registeredOn: "2019-11-14",
        status: "active",
        primary: false,
      },
      {
        id: "REG-003",
        gstin: "24AAFCF1234M1ZT",
        legalName: "Faith Automation India Pvt Ltd",
        tradeName: "Faith Automation — Sanand SEZ",
        state: "Gujarat",
        type: "SEZ",
        registeredOn: "2022-03-28",
        status: "active",
        primary: false,
      },
    ],
    returns,
    eInvoices,
    eWayBills,
    itc,
    hsn,
  };
}

function load(): GstState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as GstState;
  } catch {
    return seed();
  }
}

let state: GstState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const gstStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  update(mut: (s: GstState) => void) {
    mut(state);
    state = { ...state };
    save();
  },
  reset() {
    state = seed();
    save();
  },
};

export function useGst<T>(sel: (s: GstState) => T): T {
  return useSyncExternalStore(gstStore.subscribe, () => sel(state), () => sel(state));
}

/** Mark a return period as filed with a generated ARN. */
export function fileReturn(returnId: string) {
  gstStore.update((s) => {
    const r = s.returns.find((x) => x.id === returnId);
    if (!r) return;
    r.status = "filed";
    r.filedOn = new Date().toISOString().slice(0, 10);
    r.arn = `AA${r.gstin.slice(0, 2)}${r.period.replace("-", "")}${Math.floor(Math.random() * 9000 + 1000)}Z`;
  });
}

/** Simulate IRP registration for a pending/failed e-invoice. */
export function generateIrn(invoiceId: string) {
  gstStore.update((s) => {
    const inv = s.eInvoices.find((x) => x.id === invoiceId);
    if (!inv) return;
    inv.status = "generated";
    inv.errorMsg = undefined;
    inv.irn = Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
    inv.ackNo = `1120${Math.floor(Math.random() * 900000 + 100000)}`;
  });
}

/* ---------------- CRUD + workflow engine ---------------- */

const gCrud = makeCrud<GstState & Record<string, unknown>>(
  gstStore as unknown as { update(mut: (s: GstState & Record<string, unknown>) => void): void },
);

const num = (v: unknown) => Number(v ?? 0) || 0;

/** Metadata-driven upsert with derived tax splits and default statuses. */
export function upsertGst(key: string, record: Record<string, unknown>): string {
  const rec: Record<string, unknown> = { ...record };

  if (key === "returns") {
    rec.taxableValue = num(rec.taxableValue);
    rec.igst = num(rec.igst);
    rec.cgst = num(rec.cgst);
    rec.sgst = num(rec.sgst);
    rec.cess = num(rec.cess);
    rec.status = rec.status ?? "not-started";
  }
  if (key === "eInvoices") {
    rec.taxableValue = num(rec.taxableValue);
    rec.totalTax = num(rec.totalTax);
    rec.status = rec.status ?? "pending";
  }
  if (key === "eWayBills") {
    rec.value = num(rec.value);
    rec.distanceKm = num(rec.distanceKm);
    rec.status = rec.status ?? "active";
  }
  if (key === "itc") {
    rec.bookValue = num(rec.bookValue);
    rec.gstr2bValue = num(rec.gstr2bValue);
    const book = num(rec.bookValue);
    const twoB = num(rec.gstr2bValue);
    rec.match = !twoB ? "missing-in-2b" : !book ? "missing-in-books" : book === twoB ? "matched" : "mismatch";
    rec.itcClaimable = rec.match === "matched" || rec.match === "mismatch"
      ? Math.round(Math.min(book, twoB) * 0.18)
      : 0;
  }
  if (key === "hsn") {
    const taxable = num(rec.taxableValue);
    const rate = num(rec.rate);
    rec.qty = num(rec.qty);
    rec.taxableValue = taxable;
    rec.rate = rate;
    const tax = Math.round(taxable * (rate / 100));
    const igst = num(rec.igst) || Math.round(tax * 0.62);
    rec.igst = igst;
    rec.cgst = num(rec.cgst) || Math.round((tax - igst) / 2);
    rec.sgst = num(rec.sgst) || Math.round((tax - igst) / 2);
  }
  if (key === "registrations") {
    rec.status = rec.status ?? "active";
    rec.primary = rec.primary ?? false;
  }

  return gCrud.upsert(key as string, rec);
}

export const deleteGst = (key: string, id: string) => gCrud.remove(key as string, id);

/** Move a return from draft to ready-to-file after computing tax totals. */
export function prepareReturn(returnId: string) {
  gstStore.update((s) => {
    const r = s.returns.find((x) => x.id === returnId);
    if (!r || r.status === "filed") return;
    r.status = "ready";
  });
}

/** Cancel an already-registered IRN (within the 24h IRP window). */
export function cancelIrn(invoiceId: string) {
  gstStore.update((s) => {
    const inv = s.eInvoices.find((x) => x.id === invoiceId);
    if (!inv) return;
    inv.status = "cancelled";
    inv.errorMsg = undefined;
  });
}

/** Cancel an e-way bill. */
export function cancelEwayBill(id: string) {
  gstStore.update((s) => {
    const e = s.eWayBills.find((x) => x.id === id);
    if (e) e.status = "cancelled";
  });
}

/** Update vehicle (Part-B) and extend validity of an e-way bill. */
export function updateEwbVehicle(id: string, patch: { vehicleNo: string; validUpto: string }) {
  gstStore.update((s) => {
    const e = s.eWayBills.find((x) => x.id === id);
    if (!e) return;
    e.vehicleNo = patch.vehicleNo;
    e.validUpto = patch.validUpto;
    e.status = "active";
  });
}

/** Accept the GSTR-2B value as correct and claim the resulting ITC. */
export function acceptItcAs2b(id: string) {
  gstStore.update((s) => {
    const i = s.itc.find((x) => x.id === id);
    if (!i) return;
    i.bookValue = i.gstr2bValue;
    i.match = i.gstr2bValue ? "matched" : "missing-in-2b";
    i.itcClaimable = Math.round(i.gstr2bValue * 0.18);
  });
}

/** Re-run books ↔ GSTR-2B matching across all ITC lines. Returns exception count. */
export function reconcileItc(): number {
  let exceptions = 0;
  gstStore.update((s) => {
    s.itc.forEach((i) => {
      i.match = !i.gstr2bValue
        ? "missing-in-2b"
        : !i.bookValue
          ? "missing-in-books"
          : i.bookValue === i.gstr2bValue
            ? "matched"
            : "mismatch";
      i.itcClaimable = i.match === "matched" || i.match === "mismatch"
        ? Math.round(Math.min(i.bookValue, i.gstr2bValue) * 0.18)
        : 0;
      if (i.match !== "matched") exceptions += 1;
    });
  });
  return exceptions;
}
