import { useState, useCallback, useRef } from "react";

const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime", "video/webm"];
const MAX_SIZE_BYTES   = 200 * 1024 * 1024; // 200 MB

export interface MediaUploadState {
  file:       File | null;
  previewUrl: string | null;
  progress:   number;
  error:      string | null;
  isUploading: boolean;
  mediaType:  "image" | "video" | null;
}

export interface UseMediaUploadReturn extends MediaUploadState {
  upload:            (file: File) => Promise<void>;
  reset:             () => void;
  preload:           (url: string, type?: "image" | "video") => void;
  generateThumbnail: (videoFile: File) => Promise<string | null>;
}

export function useMediaUpload(): UseMediaUploadReturn {
  const [state, setState] = useState<MediaUploadState>({
    file: null, previewUrl: null, progress: 0,
    error: null, isUploading: false, mediaType: null,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ file: null, previewUrl: null, progress: 0, error: null, isUploading: false, mediaType: null });
  }, []);

  const generateThumbnail = useCallback(async (videoFile: File): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const url    = URL.createObjectURL(videoFile);
        const video  = document.createElement("video");
        video.src    = url;
        video.muted  = true;
        video.currentTime = 1;
        video.onloadeddata = () => {
          const canvas    = document.createElement("canvas");
          canvas.width    = video.videoWidth  || 640;
          canvas.height   = video.videoHeight || 360;
          const ctx       = canvas.getContext("2d");
          if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      } catch { resolve(null); }
    });
  }, []);

  const upload = useCallback(async (file: File): Promise<void> => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setState((s) => ({ ...s, error: "Formato não suportado. Use mp4, mov, jpg, png, gif ou webp." }));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setState((s) => ({ ...s, error: "Arquivo muito grande. Máximo 200MB." }));
      return;
    }

    const isVideo  = file.type.startsWith("video/");
    const mediaType: "image" | "video" = isVideo ? "video" : "image";

    setState((s) => ({ ...s, file, error: null, isUploading: true, progress: 0, mediaType }));

    let previewUrl: string | null = null;
    if (isVideo) {
      previewUrl = await generateThumbnail(file);
      if (!previewUrl) previewUrl = URL.createObjectURL(file);
    } else {
      previewUrl = URL.createObjectURL(file);
    }

    const simulateProgress = (step: number) => {
      if (step >= 100) {
        setState((s) => ({ ...s, progress: 100, isUploading: false, previewUrl }));
        return;
      }
      const next = Math.min(step + Math.floor(Math.random() * 18 + 8), 100);
      setState((s) => ({ ...s, progress: next }));
      timerRef.current = setTimeout(() => simulateProgress(next), 80 + Math.random() * 60);
    };

    timerRef.current = setTimeout(() => simulateProgress(0), 100);
  }, [generateThumbnail]);

  const preload = useCallback((url: string, type: "image" | "video" = "image") => {
    setState({
      file:        null,
      previewUrl:  url,
      progress:    100,
      error:       null,
      isUploading: false,
      mediaType:   type,
    });
  }, []);

  return { ...state, upload, reset, preload, generateThumbnail };
}
