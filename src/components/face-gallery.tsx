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
    <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-[var(--surface)]">
      {imgError ? (
        <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--ink-faint)]">
          {face.name}
        </div>
      ) : (
        <Image
          src={face.path}
          alt={face.name}
          fill
          className="object-cover"
          sizes="96px"
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
    <div className="space-y-3">
      <div className="x-scroll -mx-1 flex items-stretch gap-3 overflow-x-auto px-1 py-1.5">
        {PRESET_FACES.map((face) => {
          const isActive = selectedId === face.id;
          return (
            <button
              key={face.id}
              onClick={() => handlePresetClick(face)}
              disabled={disabled}
              aria-pressed={isActive}
              className={`group flex shrink-0 flex-col items-center gap-2 ${
                disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
              }`}
            >
              <div
                className={`relative rounded-xl p-1 transition-all ${
                  isActive
                    ? "bg-[var(--surface-2)] ring-2 ring-[var(--ink)]"
                    : "ring-1 ring-transparent hover:bg-[var(--surface)]"
                }`}
              >
                <FaceThumbnail face={face} />
              </div>
              <span
                className={`text-sm ${
                  isActive ? "text-[var(--ink)]" : "text-[var(--ink-dim)]"
                }`}
              >
                {face.name}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={disabled}
          aria-label={
            customImageUrl ? "Replace custom face" : "Upload custom face"
          }
          className={`group flex shrink-0 flex-col items-center gap-2 ${
            disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
          }`}
        >
          <div
            className={`relative h-[104px] w-[104px] overflow-hidden rounded-xl border-2 border-dashed p-1 transition-all ${
              isDragOver
                ? "border-[var(--ink)] bg-[var(--surface-2)]"
                : selectedId === "custom"
                  ? "border-[var(--ink)] bg-[var(--surface-2)]"
                  : "border-[var(--border-strong)] hover:border-[var(--ink-faint)] hover:bg-[var(--surface)]"
            }`}
          >
            {customImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={customImageUrl}
                alt="Custom face"
                className="pointer-events-none h-full w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="h-6 w-6 text-[var(--ink-faint)] group-hover:text-[var(--ink-dim)]"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-[11px] text-[var(--ink-faint)]">
                  Upload
                </span>
              </div>
            )}
          </div>
          <span
            className={`text-sm ${
              selectedId === "custom"
                ? "text-[var(--ink)]"
                : "text-[var(--ink-dim)]"
            }`}
          >
            Custom
          </span>
        </button>

        {selectedId && !disabled && (
          <button
            onClick={onClear}
            className="self-center rounded-md px-3 py-2 text-xs text-[var(--ink-dim)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]"
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
