import { Calendar, CheckSquare, FileText, Grid2X2, History, LinkIcon, Scissors, Send, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const audiovisualTabs = [
  ["general", "Geral", CheckSquare], ["script", "Roteiro", FileText], ["plan", "Plano de Gravação", Calendar], ["team", "Equipe", Users], ["files", "Arquivos", FileText], ["editing", "Edição", Grid2X2], ["approval", "Aprovação", Scissors], ["delivery", "Entrega", Send], ["publications", "Publicações", LinkIcon], ["history", "Histórico", History],
] as const;
export type AudiovisualTab = typeof audiovisualTabs[number][0];

export function AudiovisualTabs({ active, onChange }: { active: AudiovisualTab; onChange: (tab: AudiovisualTab) => void }) {
  return <div className="flex h-12 items-center gap-2 border-b border-border px-5">{audiovisualTabs.map(([id, label, Icon]) => <button key={id} onClick={() => onChange(id)} className={cn("relative flex h-full items-center gap-2 px-3 text-xs text-muted-foreground transition hover:text-foreground", active === id && "text-primary")}><Icon className="h-3.5 w-3.5" />{label}{active === id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}</button>)}</div>;
}

