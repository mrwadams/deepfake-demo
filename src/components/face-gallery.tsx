"use client";

import { useRef } from "react";
import Image from "next/image";
import { useState } from "react";
import { PRESET_FACES, loadPresetImage } from "@/lib/faces";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import type { PresetFace } from "@/types";

interface FaceGalleryProps {
  selectedId: string | null;
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
  onSelectFace,
  onClear,
  disabled,
}: FaceGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert("Image must be under 5MB");
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      alert("Only JPEG, PNG, or WebP images are supported");
      return;
    }

    onSelectFace(file, "Substitute the character in the video with this person.", "custom");
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2">
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
        disabled={disabled}
        className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 transition-all ${
          selectedId === "custom"
            ? "border-violet-500 bg-violet-500/20"
            : "hover:border-white/40 hover:bg-white/5"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="text-lg text-white/40">+</span>
        <span className="text-[10px] text-white/40">Upload</span>
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
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
