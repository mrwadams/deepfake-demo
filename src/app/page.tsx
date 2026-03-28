import { DeepfakeApp } from "@/components/deepfake-app";
import { PasswordGate } from "@/components/password-gate";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      <PasswordGate>
        <DeepfakeApp />
      </PasswordGate>
    </main>
  );
}
