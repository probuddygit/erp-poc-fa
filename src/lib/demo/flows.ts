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
        id: "a3s4",
        title: "GRN with 3-way match",
        say: "Receive goods and open the vendor tax invoice — PO ↔ GRN ↔ Invoice matched, printable and emailable.",
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

export const DEMO_STEPS: DemoStep[] = DEMO_ACTS.flatMap((a) => a.steps);
export const DEMO_MINUTES = DEMO_ACTS.reduce((s, a) => s + a.minutes, 0);
