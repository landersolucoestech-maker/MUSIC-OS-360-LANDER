import type { ReactNode } from "react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { IntegrationLogo } from "./IntegrationLogo";
import type { IntegrationLogoId } from "./logos";

interface IntegrationDialogHeaderProps {
  logoId: IntegrationLogoId;
  title: ReactNode;
  description: ReactNode;
}

export function IntegrationDialogHeader({
  logoId,
  title,
  description,
}: IntegrationDialogHeaderProps) {
  return (
    <DialogHeader>
      <div className="flex items-center gap-3">
        <IntegrationLogo
          id={logoId}
          className="h-10 w-10 rounded-lg"
          imageClassName="h-8 w-8"
        />
        <div className="min-w-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            {description}
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );
}
