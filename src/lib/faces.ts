import { PresetFace } from "@/types";

export const PRESET_FACES: PresetFace[] = [
  {
    id: "rebecca",
    name: "Rebecca",
    path: "/faces/rebecca.jpg",
    prompt: "Substitute the character in the video with this person.",
  },
  {
    id: "hiroshi",
    name: "Hiroshi",
    path: "/faces/hiroshi.jpg",
    prompt: "Substitute the character in the video with this person.",
  },
  {
    id: "amara",
    name: "Amara",
    path: "/faces/amara.jpg",
    prompt: "Substitute the character in the video with this person.",
  },
];

export async function loadPresetImage(face: PresetFace): Promise<File> {
  const response = await fetch(face.path);
  const blob = await response.blob();
  return new File([blob], `${face.id}.jpg`, { type: blob.type });
}
