import { useMemo, useState } from "react";

type Pattern = "statement" | "yesno" | "wh";
type Mode = Pattern | "auto";
type Point = { x: number; y: number; word: string; content: boolean };

const W = 1000;
const H = 360;
const TOP = 58;
const BOT = 302;
const functionWords = new Set([
  "a", "an", "the", "of", "to", "in", "on", "at", "for", "and", "or", "but", "is", "are", "am", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had", "will", "would", "can", "could", "may", "might", "must", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "our", "their", "this", "that", "these", "those", "with", "as", "by", "from", "if", "then", "not", "no", "just",
]);
const whWords = new Set(["what", "when", "where", "who", "whom", "whose", "why", "how", "which"]);

function clean(word: string) {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

function inferPattern(sentence: string): Pattern {
  const trimmed = sentence.trim();
  const first = clean(trimmed.split(/\s+/)[0] ?? "");
  if (trimmed.endsWith("?") && whWords.has(first)) return "wh";
  if (trimmed.endsWith("?")) return "yesno";
  return "statement";
}

function pitchFor(words: string[], pattern: Pattern) {
  const content = words.map((word) => {
    const cleaned = clean(word);
    return cleaned.length > 0 && !functionWords.has(cleaned);
  });
  let nucleus = content.length - 1;
  for (let i = content.length - 1; i >= 0; i--) {
    if (content[i]) {
      nucleus = i;
      break;
    }
  }
  return words.map((word, index) => {
    const progress = words.length === 1 ? 0 : index / (words.length - 1);
    let pitch = 0.5;
    if (pattern === "yesno") pitch = 0.34 + progress * 0.54 + (content[index] ? 0.04 : -0.02);
    if (pattern === "wh") pitch = 0.86 - progress * 0.64 + (content[index] ? 0.04 : -0.02);
    if (pattern === "statement") {
      if (index < nucleus) pitch = content[index] ? 0.6 : 0.38;
      if (index === nucleus) pitch = 0.82;
      if (index > nucleus) pitch = 0.42 - ((index - nucleus) / Math.max(1, words.length - nucleus - 1)) * 0.28;
    }
    const jitter = ((word.charCodeAt(0) + index * 17) % 9 - 4) / 120;
    return clamp(pitch + jitter, 0.08, 0.95);
  }).map((pitch, index) => ({ pitch, content: content[index] }));
}

function pointsFor(sentence: string, pattern: Pattern): Point[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean).slice(0, 18);
  if (words.length === 0) return [];
  const values = pitchFor(words, pattern);
  const left = 92;
  const right = W - 76;
  return words.map((word, index) => {
    const progress = words.length === 1 ? 0.5 : index / (words.length - 1);
    return {
      word,
      x: left + progress * (right - left),
      y: BOT - values[index].pitch * (BOT - TOP),
      content: values[index].content,
    };
  });
}

function catmullRom(points: Point[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const coord = (p: Point, axis: "x" | "y") => p[axis];
  const curve = (a: Point, b: Point, c: Point, d: Point, t: number, axis: "x" | "y") => {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * coord(b, axis) + (-coord(a, axis) + coord(c, axis)) * t + (2 * coord(a, axis) - 5 * coord(b, axis) + 4 * coord(c, axis) - coord(d, axis)) * t2 + (-coord(a, axis) + 3 * coord(b, axis) - 3 * coord(c, axis) + coord(d, axis)) * t3);
  };
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    for (let step = 1; step <= 24; step++) {
      const t = step / 24;
      d += ` L ${curve(p0, p1, p2, p3, t, "x").toFixed(1)} ${curve(p0, p1, p2, p3, t, "y").toFixed(1)}`;
    }
  }
  return d;
}

const labels: Record<Pattern, string> = {
  statement: "평서문 · 하강",
  yesno: "예-아니오 의문문 · 상승",
  wh: "Wh- 의문문 · 하강",
};

export default function IntonationWave() {
  const [sentence, setSentence] = useState("Do you like coffee?");
  const [mode, setMode] = useState<Mode>("auto");
  const pattern = mode === "auto" ? inferPattern(sentence) : mode;
  const points = useMemo(() => pointsFor(sentence, pattern), [sentence, pattern]);
  const path = useMemo(() => catmullRom(points), [points]);
  const pathId = "intonation-melody-path";

  const tab = (value: Mode, label: string) => (
    <button onClick={() => setMode(value)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${mode === value ? "border-transparent bg-[#F7ECDA] text-[#15121f]" : "border-[#3a3658] text-[#b8bce0] hover:border-[#6d668e] hover:text-white"}`}>{label}</button>
  );

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-[#15121f] px-4 py-5 text-[#F4ECDD] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#E89BD0]">Voice melody</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">억양 파형</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaa6c8]">영어 문장을 입력하면 문장 유형을 감지하고, 내용어와 기능어의 무게를 반영한 억양 곡선을 그립니다.</p>

        <div className="mt-5 rounded-lg border border-[#2c2942] bg-[#1b1828] p-4 sm:p-5">
          <label htmlFor="wave-input" className="text-sm font-bold text-[#F7ECDA]">문장 입력</label>
          <input id="wave-input" value={sentence} onChange={(event) => setSentence(event.target.value)} placeholder="Do you like coffee?" className="mt-2 h-12 w-full rounded-lg border border-[#2c2942] bg-[#211d33] px-4 text-lg text-[#F4ECDD] outline-none placeholder:text-[#6f6c93] focus:border-[#E89BD0]" />
          <div className="mt-3 flex flex-wrap gap-2">
            {tab("auto", "자동 감지")}
            {tab("statement", "평서문")}
            {tab("yesno", "예-아니오")}
            {tab("wh", "Wh- 의문문")}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-[#2c2942]" style={{ background: "radial-gradient(120% 100% at 50% 0%, #211d33 0%, #15121f 72%)" }}>
          <div className="flex flex-col gap-2 border-b border-[#2c2942] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-[#b8bce0]">{labels[pattern]}</p>
            <p className="text-xs text-[#6f6c93]">밝고 굵은 단어는 내용어, 흐린 단어는 기능어입니다.</p>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="English intonation waveform">
            <defs>
              <linearGradient id="pitch-gradient" gradientUnits="userSpaceOnUse" x1="0" y1={TOP} x2="0" y2={BOT}>
                <stop offset="0" stopColor="#FFC56B" />
                <stop offset="0.55" stopColor="#E89BD0" />
                <stop offset="1" stopColor="#7E86F2" />
              </linearGradient>
              <filter id="pitch-glow" x="-20%" y="-80%" width="140%" height="260%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {[["높음", TOP], ["", (TOP + BOT) / 2], ["낮음", BOT]].map(([label, y]) => (
              <g key={`${label}-${y}`}>
                <line x1="64" y1={y} x2={W - 44} y2={y} stroke="#37334e" strokeDasharray="2 7" />
                {label && <text x="54" y={Number(y) + 4} textAnchor="end" fontSize="13" fill="#77739b">{label}</text>}
              </g>
            ))}
            {path && <path id={pathId} d={path} fill="none" stroke="url(#pitch-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#pitch-glow)" />}
            {path && (
              <text fontSize="30" fontFamily="Georgia, 'Times New Roman', serif">
                <textPath href={`#${pathId}`} startOffset="0">
                  {points.map((point, index) => (
                    <tspan key={`${point.word}-${index}`} fill={point.content ? "#F7ECDA" : "#9AA0C8"} fillOpacity={point.content ? 1 : 0.78} fontWeight={point.content ? 700 : 400}>{`${index ? " " : ""}${point.word}`}</tspan>
                  ))}
                </textPath>
              </text>
            )}
            {!path && <text x={W / 2} y={H / 2} textAnchor="middle" fill="#77739b" fontSize="18">영어 문장을 입력하세요</text>}
          </svg>
        </div>
      </div>
    </section>
  );
}