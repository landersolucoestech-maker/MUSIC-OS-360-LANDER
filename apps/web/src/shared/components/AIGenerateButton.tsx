import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAI, type AIGenerateType } from "@/shared/hooks/useAI";
import { toast } from "sonner";

interface AIGenerateButtonProps {
  prompt: string;
  type: AIGenerateType;
  onResult: (content: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "xs";
  variant?: "ghost" | "outline" | "default";
}

export function AIGenerateButton({
  prompt,
  type,
  onResult,
  label = "Gerar com IA",
  className,
  disabled = false,
  size = "sm",
  variant = "outline",
}: AIGenerateButtonProps) {
  const { generate } = useAI();

  const handleClick = async () => {
    if (!prompt.trim()) {
      toast.warning("Preencha os campos antes de gerar com IA.");
      return;
    }
    try {
      const result = await generate.mutateAsync({ prompt, type });
      onResult(result.content);
      toast.success("Conteúdo gerado com IA!");
    } catch {
      // Error handled by hook
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled || generate.isPending}
      onClick={handleClick}
      className={cn("gap-1.5 shrink-0", className)}
      data-testid="button-ai-generate"
    >
      {generate.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      )}
      {generate.isPending ? "Gerando..." : label}
    </Button>
  );
}

interface AICopyButtonProps {
  text: string;
  className?: string;
}

export function AICopyButton({ text, className }: AICopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-7 w-7 p-0", className)}
      onClick={handleCopy}
      data-testid="button-ai-copy"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
