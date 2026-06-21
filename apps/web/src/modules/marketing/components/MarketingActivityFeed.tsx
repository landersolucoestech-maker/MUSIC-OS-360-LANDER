/**
 * Recent activity feed — renders ActivityEvent[] with an entity icon,
 * actor, action, subject and relative timestamp.
 */

import {
  CheckSquare,
  FileEdit,
  FileImage,
  Folder,
  Megaphone,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEvent } from "../types/marketing.types";
import { timeAgo } from "../utils/marketing-format";

const ENTITY_ICON: Record<ActivityEvent["entity"], LucideIcon> = {
  project: Folder,
  campaign: Megaphone,
  content: Newspaper,
  task: CheckSquare,
  briefing: FileEdit,
  asset: FileImage,
};

export function MarketingActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Sem atividades recentes</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const Icon = ENTITY_ICON[event.entity];
        return (
          <li key={event.id} className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md border border-border bg-muted/50 p-1.5 text-muted-foreground shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <span className="font-medium text-foreground">{event.author}</span>{" "}
                <span className="text-muted-foreground">{event.action}</span>{" "}
                <span className="font-medium text-foreground">{event.subject}</span>
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{timeAgo(event.at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
