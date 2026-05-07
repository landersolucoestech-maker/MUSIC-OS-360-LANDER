import { Button } from "@/shared/ui/button";
import { Download, Upload, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: {
    import?: boolean;
    export?: boolean;
    onImport?: () => void;
    onExport?: () => void;
    new?: { label: string; onClick?: () => void };
    custom?: React.ReactNode;
  };
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6",
      className
    )}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions.import && (
            <Button variant="outline" size="sm" onClick={actions.onImport} className="h-8 text-xs">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Importar
            </Button>
          )}
          {actions.export && (
            <Button variant="outline" size="sm" onClick={actions.onExport} className="h-8 text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar
            </Button>
          )}
          {actions.custom}
          {actions.new && (
            <Button size="sm" onClick={actions.new.onClick} className="h-8 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {actions.new.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
