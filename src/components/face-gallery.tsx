"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { PRESET_FACES, loadPresetImage } from "@/lib/faces";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import type { PresetFace } from "@/types";

const ACCEPTED_TYPES = /^image\/(jpeg|png|webp)$/;
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp";
const CUSTOM_PROMPT = "Substitute the character in the video with this person.";
const MAX_MB = Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024);

interface FaceGalleryProps {
  selectedId: string | null;
  customImageUrl: string | null;
  onSelectFace: (image: File, prompt: string, id: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

function FaceThumbnail({ face }: { face: PresetFace }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-white/10">
      {imgError ? (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
          {face.name}
        </div>
      ) : (
        <Image
          src={face.path}
          alt={face.name}
          fill
          className="object-cover"
          sizes="56px"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

export function FaceGallery({
  selectedId,
  customImageUrl,
  onSelectFace,
  onClear,
  disabled,
}: FaceGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptFile = (file: File) => {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`Image must be under ${MAX_MB}MB`);
      return;
    }
    if (!ACCEPTED_TYPES.test(file.type)) {
      setError("Only JPEG, PNG, or WebP images are supported");
      return;
    }
    setError(null);
    onSelectFace(file, CUSTOM_PROMPT, "custom");
  };

  const handlePresetClick = async (face: PresetFace) => {
    if (disabled) return;
    try {
      const file = await loadPresetImage(face);
      onSelectFace(file, face.prompt, face.id);
    } catch (err) {
      console.error("Failed to load preset face:", err);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="-mx-1 flex items-center gap-3 overflow-x-auto px-1 py-1">
        {PRESET_FACES.map((face) => (
          <button
            key={face.id}
            onClick={() => handlePresetClick(face)}
            disabled={disabled}
            className={`group flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${
              selectedId === face.id
                ? "bg-violet-500/20 ring-2 ring-violet-500"
                : "hover:bg-white/5"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <FaceThumbnail face={face} />
            <span className="text-xs text-white/60">{face.name}</span>
          </button>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={disabled}
          aria-label={customImageUrl ? "Replace custom face" : "Upload custom face"}
          className={`relative flex h-14 w-14 flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-all ${
            isDragOver
              ? "border-violet-400 bg-violet-500/30 scale-105"
              : selectedId === "custom"
                ? "border-violet-500 bg-violet-500/20"
                : "border-white/20 hover:border-white/40 hover:bg-white/5"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {customImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customImageUrl}
              alt="Custom face"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <span className="pointer-events-none text-lg text-white/40">+</span>
              <span className="pointer-events-none text-[10px] text-white/40">
                Upload
              </span>
            </>
          )}
        </button>

        {selectedId && (
          <button
            onClick={onClear}
            disabled={disabled}
            className="rounded-lg px-3 py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white/80 transition-all"
          >
            Clear
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
