import { useState } from "react";
import KoreanReader from "./components/KoreanReader";
import IntonationWave from "./components/IntonationWave";

type Tab = "reader" | "wave";

export default function App() {
  const [tab, setTab] = useState<Tab>("reader");

  const tabButton = (value: Tab, label: string) => (
    <button onClick={() => setTab(value)} className={`h-10 rounded-full px-4 text-sm font-black transition ${tab === value ? "bg-[#127C71] text-white" : "bg-white text-[#4d4841] hover:bg-[#eef5f2]"}`}>{label}</button>
  );

  return (
    <main className="min-h-screen bg-[#F4F4F1]">
      <header className="sticky top-0 z-20 border-b border-[#ded8cf] bg-[#F4F4F1]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#127C71]">SOUND FLOW KOREAN</p>
            <p className="mt-1 text-sm text-[#6f6b62]">Korean pronunciation and English intonation lab</p>
          </div>
          <nav className="flex gap-2" aria-label="Primary tabs">
            {tabButton("reader", "한글 읽기")}
            {tabButton("wave", "억양 파형")}
          </nav>
        </div>
      </header>
      {tab === "reader" ? <KoreanReader /> : <IntonationWave />}
    </main>
  );
}