import { Link } from "@tanstack/react-router";
import { Sparkles, Users, HardHat, GraduationCap, Building2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiCopilotPanel } from "@/components/ai/module-copilot";
import { useHR } from "@/lib/hr/store";
import { useWorkforce } from "@/lib/workforce/store";
import {
  recruitmentActions, performanceActions, learningActions, adminActions, safetyActions, complianceActions,
} from "@/lib/workforce/intelligence";

const PROMPTS: Record<string, string[]> = {
  HR: [
    "Generate a job description for a Robotics Engineer with 4 years of experience",
    "Screen our candidate pipeline and rank the top three fits",
    "Suggest interview questions for a CMM Inspector role",
    "Which employees are at attrition risk this quarter?",
    "Draft appraisal comments for our top performer",
    "Who should we promote in this appraisal cycle?",
  ],
  Safety: [
    "Identify our highest-risk work areas right now",
    "Recommend mitigations for the paint booth fire risk",
    "Predict incident trends for the next quarter",
    "Generate a safety audit summary report",
  ],
  Training: [
    "Recommend training for our biggest skill gaps",
    "Build a 6-month learning plan for the engineering team",
    "How effective was our last training programme?",
  ],
  Admin: [
    "How can we optimise travel costs this quarter?",
    "Compare our administration vendor quotes",
    "Detect duplicate or out-of-policy expense claims",
    "Which facility costs are trending up?",
  ],
  Compliance: [
    "What statutory deadlines are due in the next 30 days?",
    "Which compliance documents are missing or expired?",
    "Recommend corrective actions for our overdue obligations",
  ],
};

const COPILOTS = [
  { key: "HR", label: "HR Copilot", icon: Users, blurb: "Job descriptions, resume screening, attrition prediction, appraisal drafting and promotion recommendations." },
  { key: "Safety", label: "Safety Copilot", icon: HardHat, blurb: "High-risk area identification, mitigation advice, incident-trend prediction and audit reporting." },
  { key: "Training", label: "Training Copilot", icon: GraduationCap, blurb: "Training recommendations, learning paths and effectiveness measurement." },
  { key: "Admin", label: "Admin Copilot", icon: Building2, blurb: "Travel cost optimisation, hotel and vendor comparison, duplicate expense detection." },
  { key: "Compliance", label: "Compliance Copilot", icon: ShieldCheck, blurb: "Statutory deadline tracking, missing-document detection and corrective actions." },
] as const;

/** Specialised assistants for the Workforce & Administration suite. */
export function WorkforceCopilot() {
  const hr = useHR((s) => s);
  const w = useWorkforce((s) => s);

  const grouped = [
    { title: "HR Copilot — talent & performance", actions: [...recruitmentActions(w), ...performanceActions(w, hr)].slice(0, 6), ask: "Give me a people overview: hiring, performance and attrition risk" },
    { title: "Safety Copilot", actions: safetyActions(w).slice(0, 5), ask: "What are our highest safety risks and recommended mitigations?" },
    { title: "Training Copilot", actions: learningActions(w).slice(0, 5), ask: "What training should we plan based on our skill gaps?" },
    { title: "Admin Copilot", actions: adminActions(w).slice(0, 6), ask: "Where can we cut administration, travel and facility cost?" },
    { title: "Compliance Copilot", actions: complianceActions(w).slice(0, 6), ask: "What compliance items are due, overdue or missing documents?" },
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">AI Copilot</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Five specialised assistants grounded in live workforce, safety, administration and compliance data. Every
          recommendation links back to the record that produced it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COPILOTS.map((c) => (
          <Card key={c.key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><c.icon className="h-4 w-4" /></span>
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{c.blurb}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PROMPTS[c.key].map((p) => (
                  <Button key={p} asChild size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
                    <Link to="/ai-assistant" search={{ q: p }}>
                      <Sparkles className="h-3 w-3 text-primary" /> {p.length > 44 ? `${p.slice(0, 44)}…` : p}
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {grouped.map((g) => (
          <AiCopilotPanel key={g.title} title={g.title} actions={g.actions} askQuery={g.ask} />
        ))}
      </div>
    </div>
  );
}
