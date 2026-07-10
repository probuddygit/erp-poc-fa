import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Edit,
  MoreHorizontal,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { mdmStore } from "@/lib/mdm/store";
import { useSession } from "@/hooks/use-session";
import type { MasterDef, MasterRecord } from "@/lib/mdm/types";
import { formatFieldValue } from "./field-renderer";
import { StatusBadge } from "./status-badge";
import { ApprovalHistory } from "./approval-history";
import { ActivityTimeline } from "./activity-timeline";
import { Attachments } from "./attachments";

interface MasterViewProps {
  def: MasterDef;
  record: MasterRecord;
}

export function MasterView({ def, record }: MasterViewProps) {
  const navigate = useNavigate();
  const { user } = useSession();
  const [comment, setComment] = useState("");
  const [approveOpen, setApproveOpen] = useState<null | { step: number; decision: "approved" | "rejected" }>(null);
  const [approvalComment, setApprovalComment] = useState("");

  const actor = user?.email ?? "system";
  const groups = new Map<string, typeof def.fields>();
  for (const f of def.fields) {
    const g = f.group ?? "General";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }

  const title = def.titleField
    ? String(record.data[def.titleField] ?? record.code)
    : record.code;

  const submit = () => {
    mdmStore.submitForApproval(def, record.id, actor);
    toast.success("Submitted for approval");
  };
  const remove = () => {
    mdmStore.remove(def.key, [record.id]);
    toast.success(`${def.name} deleted`);
    navigate({ to: "/masters/$master", params: { master: def.key } });
  };
  const addComment = () => {
    const text = comment.trim();
    if (!text) return;
    mdmStore.addComment(def.key, record.id, text, actor);
    setComment("");
    toast.success("Comment added");
  };
  const confirmDecision = () => {
    if (!approveOpen) return;
    mdmStore.decideApproval(def, record.id, approveOpen.step, approveOpen.decision, actor, approvalComment.trim() || undefined);
    setApproveOpen(null);
    setApprovalComment("");
    toast.success(`Marked ${approveOpen.decision}`);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="sm" className="mt-1 gap-1.5">
            <Link to="/masters/$master" params={{ master: def.key }}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{record.code}</span>
              <StatusBadge status={record.status} />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Updated {new Date(record.updatedAt).toLocaleString()}
              {record.createdBy && ` · by ${record.createdBy}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/masters/$master/$id/edit" params={{ master: def.key, id: record.id }}>
              <Edit className="h-4 w-4" /> Edit
            </Link>
          </Button>
          {def.requiresApproval && record.status === "draft" && (
            <Button size="sm" className="gap-2" onClick={submit}>
              <Send className="h-4 w-4" /> Submit for approval
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 text-destructive" onClick={remove}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {Array.from(groups.entries()).map(([groupName, fields]) => (
            <Card key={groupName} className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : undefined}>
                      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {f.label}
                      </dt>
                      <dd className="mt-0.5 text-sm">
                        {formatFieldValue(f, record.data[f.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalHistory
            def={def}
            record={record}
            onDecide={(step, decision) => setApproveOpen({ step, decision })}
          />
        </TabsContent>

        <TabsContent value="activity">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cm" className="text-xs">Add comment</Label>
                <Textarea
                  id="cm"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Leave a note for the team…"
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={addComment} disabled={!comment.trim()}>
                    Post
                  </Button>
                </div>
              </div>
              <Separator />
              <ActivityTimeline masterKey={def.key} recordId={record.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments">
          <Attachments masterKey={def.key} recordId={record.id} actor={actor} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!approveOpen} onOpenChange={(v) => !v && setApproveOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approveOpen?.decision === "approved" ? (
                <><Check className="h-4 w-4 text-success" /> Approve step</>
              ) : (
                <><X className="h-4 w-4 text-destructive" /> Reject step</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approval-comment">Comment (optional)</Label>
            <Textarea
              id="approval-comment"
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              rows={3}
              placeholder="Reason or notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(null)}>Cancel</Button>
            <Button
              variant={approveOpen?.decision === "rejected" ? "destructive" : "default"}
              onClick={confirmDecision}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
