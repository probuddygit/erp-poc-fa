import type { LucideIcon } from "lucide-react";
import { Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModulePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  capabilities: string[];
}

export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
  capabilities,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
                {title}
              </h1>
              <Badge variant="outline" className="border-dashed text-[10px] uppercase tracking-wider">
                Coming soon
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ask AI
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-dashed">
        <CardContent className="relative p-0">
          <div className="surface-grid absolute inset-0 opacity-60" />
          <div className="relative flex flex-col items-center justify-center gap-4 p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-background shadow-sm ring-1 ring-border">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="max-w-md">
              <h2 className="font-display text-lg font-semibold">Module scaffolding is ready</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Business logic will be added incrementally. This module is wired into the platform
                shell, navigation, AI assistant, and audit history.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Planned capabilities
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <Card key={c} className="border-dashed">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div className="text-sm">{c}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
