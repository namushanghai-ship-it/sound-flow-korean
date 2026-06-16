import { useState } from "react";
import KoreanReader from "./components/KoreanReader";
import IntonationWave from "./components/IntonationWave";

type Tab = "reader" | "wave";

const ACCENT = "#127C71";

export default function App() {
  const [tab, setTab] = useState<Tab>("reader");
  const [showSounds, setShowSounds] = useState(false);

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
          <nav className="flex items-center gap-2" aria-label="Primary tabs">
            {tabButton("reader", "한글 읽기")}
            {tabButton("wave", "억양 파형")}
            {tab === "reader" && (
              <button
                onClick={() => setShowSounds((v) => !v)}
                className="flex h-10 items-center gap-2 rounded-full border border-[#DCD8CF] bg-white px-4 text-sm font-bold text-[#5f5b53]"
              >
                <span>How it sounds</span>
                <span className="relative h-6 w-11 rounded-full transition-colors" style={{ background: showSounds ? ACCENT : "#D4D0C7" }}>
                  <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: showSounds ? 22 : 2 }} />
                </span>
              </button>
            )}
          </nav>
        </div>
      </header>
      {tab === "reader" ? <KoreanReader showSounds={showSounds} /> : <IntonationWave />}
    </main>
  );
}
