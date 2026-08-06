import { useState, type ReactNode } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordDialog, ConfirmDialog, type FieldSpec } from "@/components/record-dialog";

export function RowActions({
  onEdit,
  onDelete,
  extra,
}: {
  onEdit: () => void;
  onDelete: () => void;
  extra?: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {extra}
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface EditState {
  key: string;
  title: string;
  record?: Record<string, unknown>;
}

/**
 * Wires a set of field schemas to a store's upsert/remove functions and returns
 * ready-to-render Create/Edit and Delete dialogs.
 */
export function useCrud(
  schemas: Record<string, FieldSpec[]>,
  upsert: (key: string, record: Record<string, unknown>) => string,
  remove: (key: string, id: string) => void,
) {
  const [edit, setEdit] = useState<EditState | null>(null);
  const [del, setDel] = useState<{ key: string; id: string; label: string } | null>(null);

  const openNew = (key: string, title: string, defaults?: Record<string, unknown>) =>
    setEdit({ key, title, record: defaults });

  const openEdit = (key: string, record: Record<string, unknown>, title: string) =>
    setEdit({ key, record, title });

  const askDelete = (key: string, id: string, label: string) => setDel({ key, id, label });

  const dialogs = (
    <>
      <RecordDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.title ?? ""}
        fields={edit ? (schemas[edit.key] ?? []) : []}
        initial={edit?.record}
        onSubmit={(values) => {
          if (!edit) return;
          const merged = { ...(edit.record ?? {}), ...values };
          upsert(edit.key, merged);
          toast.success(edit.record?.id ? "Record updated" : "Record created");
          setEdit(null);
        }}
      />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete record?"
        message={del ? `“${del.label}” will be permanently removed.` : ""}
        onConfirm={() => {
          if (!del) return;
          remove(del.key, del.id);
          toast.success("Record deleted");
          setDel(null);
        }}
      />
    </>
  );

  return { openNew, openEdit, askDelete, dialogs };
}
