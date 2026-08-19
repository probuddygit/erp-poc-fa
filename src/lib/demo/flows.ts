/**
 * Scripted end-to-end demo flows for customer presentations.
 * Pure data — each step deep-links into an existing route, nothing here changes app state.
 */

export interface DemoStep {
  id: string;
  title: string;
  /** One line the presenter says while on this screen. */
  say: string;
  /** Route path (TanStack route id, e.g. "/crm/$entity"). */
  to: string;
  params?: Record<string, string>;
}

export interface DemoAct {
  id: string;
  act: string;
  title: string;
  minutes: number;
  talkTrack: string;
  steps: DemoStep[];
}

export const DEMO_ACTS: DemoAct[] = [
  {
    id: "act1",
    act: "Act 1",
    title: "Command Center",
    minutes: 3,
    talkTrack:
      "One screen answers “how is the business doing right now” — dashboard-first, not report-first.",
    steps: [
      {
        id: "a1s1",
        title: "Executive Command Center",
        say: "Portfolio KPIs, OEE and departmental load heatmaps, live alerts — no report to run.",
        to: "/",
      },
    ],
  },
  {
    id: "act2",
    act: "Act 2",
    title: "Golden thread — Lead to Cash",
    minutes: 12,
    talkTrack:
      "Every step feeds the next automatically. This is the flow that wins the room — don't rush it.",
    steps: [
      {
        id: "a2s1",
        title: "Leads with AI scoring",
        say: "Each lead carries a 0–100 AI score and a duplicate-detection badge. Convert the hottest one.",
        to: "/crm/$entity",
        params: { entity: "leads" },
      },
      {
        id: "a2s2",
        title: "Opportunity deal health",
        say: "RAG deal health, stalled-deal signals and weighted pipeline — the forecast defends itself.",
        to: "/crm/$entity",
        params: { entity: "opportunities" },
      },
      {
        id: "a2s3",
        title: "Quotation pricing engine",
        say: "Discount, freight and GST computed live, with a margin guard. Print or email the quote from here.",
        to: "/crm/$entity",
        params: { entity: "quotations" },
      },
      {
        id: "a2s4",
        title: "Approve Order Acceptance — the hero moment",
        say: "Approving the OA auto-creates the project with a 3-level WBS, milestones and budget from the BIW template.",
        to: "/crm/$entity",
        params: { entity: "oas" },
      },
      {
        id: "a2s5",
        title: "The project that just appeared",
        say: "Open the new project: generated plan, EVM (SPI/CPI), health score and Copilot next-best actions.",
        to: "/projects",
      },
    ],
  },
  {
    id: "act3",
    act: "Act 3",
    title: "Execution spine",
    minutes: 8,
    talkTrack:
      "Keep following the same project downstream so it reads as one thread, not five disconnected modules.",
    steps: [
      {
        id: "a3s1",
        title: "Engineering — EBOM & design maturity",
        say: "EBOM/MBOM with a design-maturity score, and ECN where-used impact before the change is released.",
        to: "/engineering/$section",
        params: { section: "ebom" },
      },
      {
        id: "a3s2",
        title: "Requisition from AI suggestion",
        say: "The shortage becomes a requisition in one click — the system proposes, the buyer approves.",
        to: "/procurement/$section",
        params: { section: "requisitions" },
      },
      {
        id: "a3s3",
        title: "Purchase orders & vendor risk",
        say: "Vendor scorecards with predicted lead time flag the POs most likely to slip.",
        to: "/procurement/$section",
        params: { section: "orders" },
      },
      {
        id: "a3s3b",
        title: "Validate PO copy with AI",
        say: "Click Validate PO copy, pick project PRJ-1002, download the sample purchase order from the dialog and upload it — every printed part number, rate and HSN reconciles against the project's item master.",
        to: "/procurement/$section",
        params: { section: "orders" },
      },
      {
        id: "a3s4",
        title: "GRN with 3-way match",
        say: "Receive goods and open the vendor tax invoice — PO ↔ GRN ↔ Invoice matched, printable and emailable.",
        to: "/procurement/$section",
        params: { section: "grn" },
      },
      {
        id: "a3s4b",
        title: "Validate invoice / GRN with AI",
        say: "Upload the sample vendor invoice from the dialog: one mistyped part number comes back as a near match, one part is unmatched, plus an 18% rate deviation and a wrong HSN — all caught before the GRN is posted.",
        to: "/procurement/$section",
        params: { section: "grn" },
      },

      {
        id: "a3s5",
        title: "Project-tagged inventory",
        say: "Stock is tagged to the project, ABC classified, with stock-out forecast and one-click replenishment.",
        to: "/inventory/$section",
        params: { section: "stock" },
      },
      {
        id: "a3s6",
        title: "Quality — inspection to NCR to CAPA",
        say: "A failed inspection raises an NCR, which drives a CAPA with full 8D traceability back to the part.",
        to: "/quality/$section",
        params: { section: "inspections" },
      },
    ],
  },
  {
    id: "act4",
    act: "Act 4",
    title: "Money and compliance",
    minutes: 4,
    talkTrack: "Drop this act first if you are running behind — summarise it verbally instead.",
    steps: [
      {
        id: "a4s1",
        title: "Payables & double-entry",
        say: "The matched vendor invoice posts straight to double-entry, with project costing and WIP.",
        to: "/finance/$section",
        params: { section: "ap" },
      },
      {
        id: "a4s2",
        title: "GST returns & e-Way Bill",
        say: "GSTR summary, e-invoicing IRN and e-Way Bills generated from the same transactions.",
        to: "/gst/$section",
        params: { section: "returns" },
      },
    ],
  },
  {
    id: "act5",
    act: "Act 5",
    title: "AI Assistant close",
    minutes: 3,
    talkTrack:
      "Close on grounded AI: answers come from real ERP records, and every number can be clicked through.",
    steps: [
      {
        id: "a5s1",
        title: "Ask across modules",
        say: "Try: “Which projects will slip this month and why?” then “Top 5 vendors by delivery risk”.",
        to: "/ai-assistant",
      },
      {
        id: "a5s2",
        title: "Scheduled executive narrative",
        say: "The same intelligence is delivered as a scheduled report with an AI-written narrative.",
        to: "/reports",
      },
    ],
  },
];

/** Finance & Project Accounting deep-dive — for CFO / controller audiences. */
export const FINANCE_ACTS: DemoAct[] = [
  {
    id: "f1",
    act: "Act 1",
    title: "Order to Cash",
    minutes: 5,
    talkTrack:
      "Start where the money starts: an approved order creates the project, the billing plan and the first journal — no manual entry.",
    steps: [
      {
        id: "f1s1",
        title: "Approve the Order Acceptance",
        say: "Approving the OA provisions the project, WBS, milestones and the billing plan in one action.",
        to: "/crm/$entity",
        params: { entity: "oas" },
      },
      {
        id: "f1s2",
        title: "Receivables & milestone billing",
        say: "The milestone invoice carries HSN/SAC and the CGST-SGST-IGST split computed from Item Master — nothing typed.",
        to: "/finance/$section",
        params: { section: "ar" },
      },
      {
        id: "f1s3",
        title: "The journal that wrote itself",
        say: "Debit Receivables, credit Revenue, credit GST — posted by the engine, tagged to the project.",
        to: "/finance/$section",
        params: { section: "gl" },
      },
    ],
  },
  {
    id: "f2",
    act: "Act 2",
    title: "Procure to Pay & TDS",
    minutes: 5,
    talkTrack:
      "Show the control story: three-way match, AI document validation and statutory deduction all happen before payment.",
    steps: [
      {
        id: "f2s1",
        title: "GRN posts the accrual",
        say: "Receiving goods books the material accrual against the project — finance sees cost the moment stores does.",
        to: "/procurement/$section",
        params: { section: "grn" },
      },
      {
        id: "f2s2",
        title: "Payables — 3-way match",
        say: "PO ↔ GRN ↔ Invoice matched automatically; quantity and price variances are held, not paid.",
        to: "/finance/$section",
        params: { section: "ap" },
      },
      {
        id: "f2s3",
        title: "AI part-number validation",
        say: "Upload the vendor invoice PDF — vision extraction flags near-match part codes, >10% rate variance and HSN mismatches.",
        to: "/procurement/$section",
        params: { section: "orders" },
      },
      {
        id: "f2s4",
        title: "TDS automation",
        say: "Section rules, thresholds and vendor type drive the deduction and the statutory ledger — ready for the certificate.",
        to: "/finance/$section",
        params: { section: "tds" },
      },
    ],
  },
  {
    id: "f3",
    act: "Act 3",
    title: "Project costing, WIP & revenue recognition",
    minutes: 6,
    talkTrack:
      "This is the differentiator versus accounting-first ERPs: costing and revenue recognition are project-native.",
    steps: [
      {
        id: "f3s1",
        title: "Approve a timesheet",
        say: "Approved hours become an idempotent weekly labour journal against the project — no re-posting on re-run.",
        to: "/hr/$section",
        params: { section: "timesheets" },
      },
      {
        id: "f3s2",
        title: "Project costing build-up",
        say: "Material, labour, sub-contract and committed cost from open POs and PRs — drill into any number.",
        to: "/finance/$section",
        params: { section: "projects" },
      },
      {
        id: "f3s3",
        title: "WIP & POC revenue recognition",
        say: "Run the period: cost-to-cost percentage complete, opening → additions → released → closing, with the WIP journal generated.",
        to: "/finance/$section",
        params: { section: "wip" },
      },
    ],
  },
  {
    id: "f4",
    act: "Act 4",
    title: "Allocation, Project P&L and statements",
    minutes: 6,
    talkTrack: "Now roll it up: every overhead lands on a project, and every statement drills back to the source document.",
    steps: [
      {
        id: "f4s1",
        title: "Expense allocation run",
        say: "Pooled overheads distributed by driver — man-hours, percentage or direct — then posted as a run you can audit.",
        to: "/finance/$section",
        params: { section: "allocation" },
      },
      {
        id: "f4s2",
        title: "Project P&L and Balance Sheet",
        say: "Revenue, direct cost, allocated overhead, gross and net margin — plus receivables, advances and unbilled WIP.",
        to: "/finance/$section",
        params: { section: "project-pnl" },
      },
      {
        id: "f4s3",
        title: "Financial statements with drill-through",
        say: "Trial Balance, P&L, Balance Sheet and Cash Flow with project and FY filters — click a line down to the source transaction.",
        to: "/finance/$section",
        params: { section: "statements" },
      },
    ],
  },
  {
    id: "f5",
    act: "Act 5",
    title: "AI Copilot & controlled closure",
    minutes: 5,
    talkTrack: "Close on control plus intelligence: the Copilot explains the numbers, the closure wizard protects them.",
    steps: [
      {
        id: "f5s1",
        title: "Finance AI Copilot",
        say: "Cash, receivables and margin assistants — 13-week forecast and collection risk, grounded in the live ledger.",
        to: "/finance/$section",
        params: { section: "copilot" },
      },
      {
        id: "f5s2",
        title: "GST returns from the same data",
        say: "e-invoices from AR, ITC from AP bills, settlement journals auto-posted — one dataset, no reconciliation project.",
        to: "/gst/$section",
        params: { section: "returns" },
      },
      {
        id: "f5s3",
        title: "Project closure guard",
        say: "The checklist blocks closure on open POs, open AR, WIP or stock; once closed, new postings to the project are rejected.",
        to: "/finance/$section",
        params: { section: "project-closure" },
      },
    ],
  },
];

export interface DemoScript {
  id: string;
  name: string;
  audience: string;
  summary: string;
  acts: DemoAct[];
}

export const DEMO_SCRIPTS: DemoScript[] = [
  {
    id: "lead-to-cash",
    name: "Lead to Cash",
    audience: "Executive / cross-functional",
    summary: "The full golden thread from lead to project, execution, money and AI close.",
    acts: DEMO_ACTS,
  },
  {
    id: "finance",
    name: "Finance & Project Accounting",
    audience: "CFO / Controller / Finance team",
    summary:
      "Order-to-cash, procure-to-pay controls, project WIP and POC revenue, allocation, statements, Copilot and closure.",
    acts: FINANCE_ACTS,
  },
];

export const DEFAULT_SCRIPT_ID = DEMO_SCRIPTS[0].id;

export function scriptById(id: string | undefined): DemoScript {
  return DEMO_SCRIPTS.find((s) => s.id === id) ?? DEMO_SCRIPTS[0];
}

export function stepsOf(script: DemoScript): DemoStep[] {
  return script.acts.flatMap((a) => a.steps);
}

export function minutesOf(script: DemoScript): number {
  return script.acts.reduce((s, a) => s + a.minutes, 0);
}

export const DEMO_STEPS: DemoStep[] = DEMO_ACTS.flatMap((a) => a.steps);
export const DEMO_MINUTES = DEMO_ACTS.reduce((s, a) => s + a.minutes, 0);

