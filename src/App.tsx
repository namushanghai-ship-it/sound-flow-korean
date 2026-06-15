type Phrase = {
  ko: string;
  sound: string;
  roman: string;
  meaning: string;
  tip: string;
};

type Pattern = "statement" | "yesno" | "wh";

type MelodyPoint = {
  word: string;
  x: number;
  y: number;
  strong: boolean;
};

const phrases: Phrase[] = [
  { ko: "안녕하세요", sound: "안녕하세요", roman: "annyeonghaseyo", meaning: "Hello", tip: "Keep the last syllable light and open." },
  { ko: "감사합니다", sound: "감사함니다", roman: "gamsahamnida", meaning: "Thank you", tip: "The final sound blends into an m before 니." },
  { ko: "얼마예요?", sound: "얼마예요", roman: "eolmayeyo", meaning: "How much is it?", tip: "Raise the ending gently for a question." },
  { ko: "화장실 어디예요?", sound: "화장실 어디예요", roman: "hwajangsil eodiyeyo", meaning: "Where is the restroom?", tip: "Break it into two chunks: place, then where." },
  { ko: "계산해 주세요", sound: "계산해 주세요", roman: "gyesanhae juseyo", meaning: "Check, please", tip: "Use a soft request rhythm on 주세요." },
  { ko: "도와주세요", sound: "도와주세요", roman: "dowajuseyo", meaning: "Please help me", tip: "Put the strongest stress on 와." },
];

const functionWords = new Set([
  "a", "an", "the", "to", "of", "in", "on", "at", "for", "and", "or", "but", "is", "are", "am", "do", "does", "did", "you", "i", "we", "they", "it", "he", "she", "my", "your", "our", "their",
]);

const whWords = new Set(["what", "when", "where", "who", "whose", "why", "how", "which"]);

function cleanWord(word: string) {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}

function inferPattern(sentence: string): Pattern {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const first = cleanWord(words[0] ?? "");
  if (sentence.trim().endsWith("?") && whWords.has(first)) return "wh";
  if (sentence.trim().endsWith("?")) return "yesno";
  return "statement";
}

function melody(sentence: string, pattern: Pattern): MelodyPoint[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean).slice(0, 12);
  if (words.length === 0) return [];

  return words.map((word, index) => {
    const progress = words.length === 1 ? 0 : index / (words.length - 1);
    const strong = !functionWords.has(cleanWord(word));
    let height = 0.48;

    if (pattern === "yesno") height = 0.34 + progress * 0.48;
    if (pattern === "wh") height = 0.78 - progress * 0.46;
    if (pattern === "statement") height = index === words.length - 1 ? 0.24 : 0.52 + (strong ? 0.16 : 0);

    const wave = Math.sin(index * 1.7) * 0.045;
    const y = 84 - Math.max(0.12, Math.min(0.9, height + wave)) * 68;
    return { word, x: 8 + progress * 84, y, strong };
  });
}

function pathFrom(points: MelodyPoint[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export default function App() {
  const sentence = "Do you like coffee?";
  const pattern = inferPattern(sentence);
  const points = melody(sentence, pattern);
  const line = pathFrom(points);

  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#211d1a]">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-8">
        <div className="flex min-h-[calc(100vh-2.5rem)] flex-col justify-between rounded-lg bg-[#23302f] p-5 text-white sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9ed8ca]">Sound Flow Korean</p>
            <h1 className="mt-3 max-w-md font-ko text-4xl font-black leading-tight sm:text-5xl">한글 소리와 영어 억양을 한 화면에서 연습</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#d7e4dd] sm:text-base">Korean pronunciation cards, romanization, slow listening cues, and a compact English pitch contour tester for language app experiments.</p>
          </div>

          <div className="mt-8 rounded-lg border border-white/15 bg-white/8 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#9ed8ca]">Pitch contour</p>
                <p className="mt-1 text-lg font-semibold">{sentence}</p>
              </div>
              <span className="rounded-full bg-[#f2b45b] px-3 py-1 text-xs font-bold text-[#2b2116]">yes/no</span>
            </div>
            <svg viewBox="0 0 100 92" className="mt-4 h-48 w-full overflow-visible" role="img" aria-label="English intonation curve">
              <line x1="4" y1="16" x2="96" y2="16" stroke="#5c6b66" strokeDasharray="2 4" />
              <line x1="4" y1="50" x2="96" y2="50" stroke="#5c6b66" strokeDasharray="2 4" />
              <line x1="4" y1="84" x2="96" y2="84" stroke="#5c6b66" strokeDasharray="2 4" />
              <path d={line} fill="none" stroke="#f2b45b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point) => (
                <g key={`${point.word}-${point.x}`}>
                  <circle cx={point.x} cy={point.y} r={point.strong ? 2.5 : 1.8} fill={point.strong ? "#f2b45b" : "#9ed8ca"} />
                  <text x={point.x} y={Math.min(89, point.y + 12)} textAnchor="middle" fontSize="4.4" fill={point.strong ? "#fff6e7" : "#bcd4cc"}>{point.word}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-[#ded4c4] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#21786e]">Practice deck</p>
                <h2 className="mt-1 font-ko text-2xl font-extrabold">여행 한국어 발음 카드</h2>
              </div>
              <button className="h-10 rounded-md bg-[#21786e] px-4 text-sm font-bold text-white active:scale-[0.98]">Start review</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {phrases.map((phrase) => (
              <article key={phrase.ko} className="rounded-lg border border-[#ded4c4] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-keep font-ko text-2xl font-black leading-tight text-[#1e2a28]">{phrase.ko}</h3>
                    <p className="mt-2 font-ko text-xl font-extrabold text-[#21786e]">{phrase.sound}</p>
                  </div>
                  <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#211d1a] text-sm font-bold text-white" aria-label={`${phrase.ko} 듣기`}>▶</button>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#c1693c]">{phrase.roman}</p>
                <p className="mt-1 text-sm text-[#5f5951]">{phrase.meaning}</p>
                <div className="mt-4 rounded-md bg-[#f7f3ec] p-3 text-sm leading-6 text-[#4b4741]">{phrase.tip}</div>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-[#ded4c4] bg-white p-4 shadow-sm sm:p-5">
            <label htmlFor="custom" className="font-ko text-sm font-bold text-[#1e2a28]">직접 입력</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input id="custom" className="h-11 min-w-0 rounded-md border border-[#cfc5b6] px-3 text-base outline-none focus:border-[#21786e]" defaultValue="같이 가요" />
              <button className="h-11 rounded-md bg-[#f2b45b] px-4 text-sm font-bold text-[#2b2116]">Analyze</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
