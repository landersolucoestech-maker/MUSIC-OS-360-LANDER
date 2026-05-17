import { useRef, useState } from "react";
import { Upload, X, Video, Image, AlertCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { UseMediaUploadReturn } from "@/modules/marketing/hooks/useMediaUpload";

interface MediaUploaderProps {
  media: UseMediaUploadReturn;
  className?: string;
  compact?: boolean;
}

export function MediaUploader({ media, className, compact = false }: MediaUploaderProps) {
  const inputRef      = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) media.upload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) media.upload(file);
    e.target.value = "";
  };

  if (media.previewUrl && !media.isUploading) {
    return (
      <div className={cn("relative w-full rounded-xl overflow-hidden group", className)}>
        {media.mediaType === "video" ? (
          <div className="relative w-full aspect-[4/5] bg-black flex items-center justify-center">
            <Video className="h-10 w-10 text-white/40" />
            <img
              src={media.previewUrl}
              alt="thumbnail"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              onError={() => {}}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl ml-1">▶</span>
              </div>
            </div>
          </div>
        ) : (
          <img
            src={media.previewUrl}
            alt="preview"
            className={cn("w-full object-cover", compact ? "aspect-video" : "aspect-[4/5]")}
          />
        )}
        <button
          type="button"
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
          onClick={() => media.reset()}
        >
          <X className="h-3 w-3" />
        </button>
        {!compact && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 rounded-md px-1.5 py-0.5">
            {media.mediaType === "video"
              ? <Video className="h-3 w-3 text-white" />
              : <Image className="h-3 w-3 text-white" />
            }
            <span className="text-[9px] text-white font-medium capitalize">{media.mediaType}</span>
          </div>
        )}
      </div>
    );
  }

  if (media.isUploading) {
    return (
      <div className={cn(
        "w-full rounded-xl border border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-2 p-4",
        compact ? "aspect-video" : "aspect-[4/5]",
        className,
      )}>
        <Upload className="h-5 w-5 text-primary animate-bounce" />
        <span className="text-xs text-muted-foreground">Carregando…</span>
        <div className="w-full max-w-[120px] h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-150"
            style={{ width: `${media.progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground/60">{media.progress}%</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
          compact ? "p-4" : "p-6 aspect-[4/5]",
          dragOver
            ? "border-primary bg-primary/10 scale-[0.99]"
            : "border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
        )}
      >
        <div className={cn(
          "rounded-full flex items-center justify-center",
          dragOver ? "bg-primary/20" : "bg-muted",
          compact ? "h-8 w-8" : "h-12 w-12",
        )}>
          <Upload className={cn("text-muted-foreground", dragOver ? "text-primary" : "", compact ? "h-4 w-4" : "h-5 w-5")} />
        </div>
        {!compact && (
          <>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {dragOver ? "Soltar aqui" : "Arraste ou clique para fazer upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vídeo ou imagem • Máx. 200MB
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
              <span>MP4 • MOV • JPG • PNG • GIF • WEBP</span>
            </div>
          </>
        )}
        {compact && (
          <span className="text-[10px] text-muted-foreground text-center leading-tight">
            Arraste ou clique<br />para fazer upload
          </span>
        )}
      </div>

      {media.error && (
        <div className="flex items-center gap-1.5 mt-2 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{media.error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
        onChange={handleFileChange}
      />
    </div>
  );
}
