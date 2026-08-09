import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function FinToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function FinSearch({ q, setQ, placeholder }: { q: string; setQ: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  );
}

export function SegTabs<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { k: T; l: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-md border p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={`rounded px-3 py-1 transition-colors ${value === o.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function VarianceBar({ pct }: { pct: number }) {
  const adverse = pct < 0;
  const width = Math.min(100, Math.abs(pct));
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`absolute inset-y-0 ${adverse ? "left-1/2 bg-rose-500" : "right-1/2 bg-emerald-500"}`}
        style={{ width: `${width / 2}%` }}
      />
      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
    </div>
  );
}
