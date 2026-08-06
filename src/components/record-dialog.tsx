import { ComboboxField, type ComboOption } from "@/components/combobox-field";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "combobox"
  | "email"
  | "file";

export interface FieldSpec {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  /** combobox only — key into RecordDialog `dynamicOptions` */
  optionsKey?: string;
  required?: boolean;
  placeholder?: string;
  colSpan?: 1 | 2;
  /** file only — accept attribute */
  accept?: string;
}


function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_INLINE_BYTES = 3 * 1024 * 1024;


export interface RecordDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  fields: FieldSpec[];
  initial?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  submitLabel?: string;
  /** option lists for `combobox` fields, keyed by FieldSpec.optionsKey */
  dynamicOptions?: Record<string, ComboOption[]>;
}


function toInputDate(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function RecordDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
  submitLabel = "Save",
  dynamicOptions,

}: RecordDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const seed: Record<string, unknown> = {};
    for (const f of fields) {
      const v = initial?.[f.name];
      if (f.type === "date") seed[f.name] = toInputDate(v);
      else seed[f.name] = v ?? (f.type === "number" ? "" : "");
      if (f.type === "file") {
        seed[`${f.name}Name`] = initial?.[`${f.name}Name`] ?? "";
        seed[`${f.name}Type`] = initial?.[`${f.name}Type`] ?? "";
      }
    }

    setValues(seed);
    setErrors({});
  }, [open, fields, initial]);

  const set = (k: string, v: unknown) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const has = (n: string) => fields.some((f) => f.name === n);

  const handleFile = async (f: FieldSpec, file: File | undefined) => {
    if (!file) return;
    const patch: Record<string, unknown> = {
      [`${f.name}Name`]: file.name,
      [`${f.name}Type`]: file.type || "application/octet-stream",
    };
    if (has("name") && !values["name"]) patch["name"] = file.name.replace(/\.[^.]+$/, "");
    if (has("size")) patch["size"] = humanSize(file.size);
    if (file.size <= MAX_INLINE_BYTES) {
      patch[f.name] = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
    } else {
      patch[f.name] = "";
      setErrors((e) => ({ ...e, [f.name]: "File too large to store (max 3 MB) — details saved without the file." }));
    }
    setValues((prev) => ({ ...prev, ...patch }));
  };


  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.required) {
        const v = values[f.name];
        if (v === undefined || v === null || v === "") errs[f.name] = "Required";
      }
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const out: Record<string, unknown> = { ...values };
    for (const f of fields) {
      let v = values[f.name];
      if (f.type === "number") v = v === "" || v === null ? undefined : Number(v);
      else if (f.type === "date")
        v = v ? new Date(v as string).toISOString() : undefined;
      out[f.name] = v;
    }

    onSubmit(out);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {fields.map((f) => (
            <div
              key={f.name}
              className={f.colSpan === 2 || f.type === "textarea" ? "sm:col-span-2" : ""}
            >
              <Label htmlFor={f.name} className="mb-1.5 block text-xs">
                {f.label}
                {f.required && <span className="ml-1 text-destructive">*</span>}
              </Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  value={(values[f.name] as string) ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  className="min-h-20"
                />
              ) : f.type === "combobox" ? (
                <ComboboxField
                  id={f.name}
                  value={(values[f.name] as string) ?? ""}
                  placeholder={f.placeholder ?? "Search and select…"}
                  options={(f.optionsKey && dynamicOptions?.[f.optionsKey]) || (f.options ?? []).map((o) => ({ value: o, label: o }))}
                  onChange={(v, opt) =>
                    setValues((prev) => ({ ...prev, [f.name]: v, ...(opt?.patch ?? {}) }))
                  }
                />
              ) : f.type === "select" ? (

                <Select
                  value={(values[f.name] as string) ?? ""}
                  onValueChange={(v) => set(f.name, v)}
                >
                  <SelectTrigger id={f.name}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt.replace(/-/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "file" ? (
                <div className="space-y-1.5">
                  <Input
                    id={f.name}
                    type="file"
                    accept={f.accept}
                    className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
                    onChange={(e) => void handleFile(f, e.target.files?.[0])}
                  />
                  {!!values[`${f.name}Name`] && (
                    <p className="truncate text-xs text-muted-foreground">
                      Attached: {String(values[`${f.name}Name`])}
                    </p>
                  )}
                </div>
              ) : (

                <Input
                  id={f.name}
                  type={
                    f.type === "number"
                      ? "number"
                      : f.type === "date"
                      ? "date"
                      : f.type === "email"
                      ? "email"
                      : "text"
                  }
                  value={(values[f.name] as string | number) ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
              {errors[f.name] && (
                <div className="mt-1 text-xs text-destructive">{errors[f.name]}</div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  message?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Delete record?",
  message = "This action cannot be undone.",
  onConfirm,
}: ConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
