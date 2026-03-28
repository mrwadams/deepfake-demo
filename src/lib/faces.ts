import { PresetFace } from "@/types";

export const PRESET_FACES: PresetFace[] = [
  {
    id: "dave",
    name: "Dave",
    path: "/faces/dave.jpg",
    prompt: "Substitute the character in the video with this person.",
  },
  {
    id: "steve",
    name: "Steve",
    path: "/faces/steve.png",
    prompt: "Substitute the character in the video with this person.",
  },
  {
    id: "taylor",
    name: "Taylor",
    path: "/faces/taylor.jpg",
    prompt: "Substitute the character in the video with this person.",
  },
];

export async function loadPresetImage(face: PresetFace): Promise<File> {
  const response = await fetch(face.path);
  const blob = await response.blob();
  return new File([blob], `${face.id}.jpg`, { type: blob.type });
}
