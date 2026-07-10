import type { FieldDef } from "@/lib/mdm/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FieldRendererProps {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
  id?: string;
}

export function FieldRenderer({ field, value, onChange, readOnly, id }: FieldRendererProps) {
  const inputId = id ?? `f-${field.key}`;
  const common = { id: inputId, disabled: readOnly, "aria-required": field.required };

  const wrap = (input: React.ReactNode) => (
    <div className={cn("space-y-1.5", field.span === 2 && "sm:col-span-2")}>
      <Label htmlFor={inputId} className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {input}
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );

  const strVal = value == null ? "" : String(value);

  switch (field.type) {
    case "textarea":
      return wrap(
        <Textarea
          {...common}
          value={strVal}
          placeholder={field.placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />,
      );
    case "number":
    case "currency":
      return wrap(
        <Input
          {...common}
          type="number"
          inputMode="decimal"
          step={field.type === "currency" ? "0.01" : "1"}
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />,
      );
    case "email":
      return wrap(
        <Input {...common} type="email" value={strVal} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />,
      );
    case "phone":
      return wrap(
        <Input {...common} type="tel" value={strVal} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />,
      );
    case "date":
      return wrap(
        <Input {...common} type="date" value={strVal} onChange={(e) => onChange(e.target.value)} />,
      );
    case "boolean":
      return (
        <div className={cn("flex items-center justify-between rounded-lg border bg-card/40 px-3 py-2", field.span === 2 && "sm:col-span-2")}>
          <div>
            <Label htmlFor={inputId} className="text-sm">{field.label}</Label>
            {field.helpText && <p className="text-[11px] text-muted-foreground">{field.helpText}</p>}
          </div>
          <Switch id={inputId} disabled={readOnly} checked={!!value} onCheckedChange={onChange} />
        </div>
      );
    case "select":
      return wrap(
        <Select value={strVal || undefined} disabled={readOnly} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={inputId}>
            <SelectValue placeholder={field.placeholder ?? "Select…"} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );
    case "text":
    default:
      return wrap(
        <Input {...common} value={strVal} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />,
      );
  }
}

export function formatFieldValue(field: FieldDef, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (field.type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "currency":
      return typeof value === "number"
        ? value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
        : String(value);
    case "select":
      return field.options?.find((o) => o.value === value)?.label ?? String(value);
    case "date":
      return typeof value === "string" ? value : String(value);
    default:
      return String(value);
  }
}
