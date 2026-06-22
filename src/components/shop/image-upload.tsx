"use client";

import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { useRef, useState, useCallback } from "react";

/**
 * Multi-image upload component (Leboncoin-style).
 * - Drag & drop or click to select
 * - Client-side resize to max 800x600 (WebP, quality 0.8)
 * - Max 4 images, max 500KB each (after resize)
 * - Preview grid with remove buttons
 *
 * Returns base64 data URLs via onChange callback.
 */

const MAX_IMAGES = 4;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const QUALITY = 0.8;

type ImageUploadProps = {
  images: string[];
  onChange: (images: string[]) => void;
};

export function ImageUpload({ images, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resizeImage = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
          reject(new Error("Le fichier n'est pas une image"));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            // Calculate new dimensions (maintain aspect ratio)
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }

            // Draw to canvas
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas non supporté"));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to WebP (smaller than JPEG/PNG)
            const dataUrl = canvas.toDataURL("image/webp", QUALITY);

            // Check size (base64 string length ≈ 1.37x actual bytes)
            const sizeBytes = Math.round((dataUrl.length - 22) * 0.75);
            if (sizeBytes > 500 * 1024) {
              // Re-compress with lower quality
              const lowerQuality = canvas.toDataURL("image/webp", 0.5);
              resolve(lowerQuality);
            } else {
              resolve(dataUrl);
            }
          };
          img.onerror = () => reject(new Error("Image invalide"));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Lecture du fichier échouée"));
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      setProcessing(true);

      try {
        const remaining = MAX_IMAGES - images.length;
        const filesToProcess = Array.from(files).slice(0, remaining);

        if (files.length > remaining) {
          setError(`Maximum ${MAX_IMAGES} images. ${remaining} ajoutée(s).`);
        }

        const newImages: string[] = [];
        for (const file of filesToProcess) {
          try {
            const dataUrl = await resizeImage(file);
            newImages.push(dataUrl);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur traitement image");
          }
        }

        if (newImages.length > 0) {
          onChange([...images, ...newImages]);
        }
      } finally {
        setProcessing(false);
      }
    },
    [images, onChange, resizeImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {/* Upload zone */}
      {images.length < MAX_IMAGES && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            dragging
              ? "border-fuchsia-400 bg-fuchsia-50"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {processing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-fuchsia-500" />
              <p className="text-sm text-slate-500">Traitement des images…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="grid size-12 place-items-center rounded-xl bg-slate-100">
                <Upload className="size-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Glisse des photos ici ou clique pour choisir
              </p>
              <p className="text-[11px] text-slate-400">
                Max {MAX_IMAGES} photos · JPG/PNG/WebP · redimensionnées automatiquement
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-xl overflow-hidden group bg-slate-100"
            >
              <img
                src={img}
                alt={`Photo ${i + 1}`}
                className="size-full object-cover"
              />
              {/* First image badge */}
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-fuchsia-600 text-white text-[9px] font-bold px-1.5 py-0.5">
                  Photo principale
                </span>
              )}
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(i);
                }}
                className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}

      {/* Count indicator */}
      {images.length > 0 && (
        <p className="text-[11px] text-slate-400">
          {images.length}/{MAX_IMAGES} photo{images.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
