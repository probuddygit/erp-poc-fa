import {
  CheckCircle2,
  CirclePlus,
  Edit3,
  MessageSquare,
  Paperclip,
  Send,
  Upload,
  XCircle,
  Circle,
} from "lucide-react";
import { useMasterActivity } from "@/lib/mdm/store";
import type { ActivityEvent } from "@/lib/mdm/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityEvent["type"], { icon: React.ComponentType<any>; tone: string }> = {
  created: { icon: CirclePlus, tone: "bg-primary/15 text-primary" },
  updated: { icon: Edit3, tone: "bg-info/15 text-info" },
  submitted: { icon: Send, tone: "bg-warning/15 text-warning" },
  approved: { icon: CheckCircle2, tone: "bg-success/15 text-success" },
  rejected: { icon: XCircle, tone: "bg-destructive/15 text-destructive" },
  commented: { icon: MessageSquare, tone: "bg-muted text-foreground" },
  attachment_added: { icon: Paperclip, tone: "bg-accent/20 text-accent-foreground" },
  attachment_removed: { icon: Paperclip, tone: "bg-muted text-muted-foreground" },
  imported: { icon: Upload, tone: "bg-info/15 text-info" },
};

export function ActivityTimeline({
  masterKey,
  recordId,
}: {
  masterKey: string;
  recordId: string;
}) {
  const events = useMasterActivity(masterKey, recordId);
  if (events.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">No activity yet.</div>;
  }
  return (
    <ol className="relative space-y-4 pl-6">
      <span className="absolute left-2 top-2 bottom-2 w-px bg-border" aria-hidden />
      {events.map((e) => {
        const cfg = ICONS[e.type] ?? { icon: Circle, tone: "bg-muted" };
        const Icon = cfg.icon;
        return (
          <li key={e.id} className="relative">
            <span className={cn("absolute -left-6 top-0.5 grid h-5 w-5 place-items-center rounded-full", cfg.tone)}>
              <Icon className="h-3 w-3" />
            </span>
            <div className="text-sm">{e.message}</div>
            <div className="text-[11px] text-muted-foreground">
              {new Date(e.ts).toLocaleString()}
              {e.actor && ` · ${e.actor}`}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
