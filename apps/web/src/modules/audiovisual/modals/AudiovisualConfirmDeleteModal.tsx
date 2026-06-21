import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import type { AudiovisualProject } from "../types/audiovisual.types";

export function AudiovisualConfirmDeleteModal({ open, project, onClose, onConfirm }: { open: boolean; project: AudiovisualProject | null; onClose: () => void; onConfirm: () => void }) {
  const title = project?.music_title ?? project?.title ?? project?.name ?? "projeto selecionado";
  return (
    <AlertDialog open={open && !!project} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle>Excluir produção</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">Essa ação não pode ser desfeita.</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <p className="text-sm leading-6 text-muted-foreground">
          Confirme a exclusão de <span className="font-semibold text-foreground">{title}</span>. A lista será atualizada após a remoção.
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
