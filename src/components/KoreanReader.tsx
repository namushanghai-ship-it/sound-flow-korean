import { useMemo, useState } from "react";

type HangulToken = { h: true; cho: number; jung: number; jong: number; original: string };
type OtherToken = { h: false; ch: string; original: string };
type Token = HangulToken | OtherToken;
type Link = { from: number; to: number; jamo: string; drop?: boolean };
type AnalyzeResult = { chars: string[]; hangul: string; roman: string; links: Link[] };
type Phrase = { ko: string; roman: string; en: string };

const ACCENT = "#127C71";
const KO = '"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';

const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;
const ROM_CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"] as const;
const ROM_JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"] as const;

const NEUTRAL: Record<number, string> = {
  0: "", 1: "k", 2: "k", 3: "k", 9: "k", 24: "k",
  4: "n", 5: "n", 6: "n", 7: "t", 19: "t", 20: "t", 22: "t", 23: "t", 25: "t", 27: "t",
  8: "l", 11: "l", 12: "l", 13: "l", 15: "l", 10: "m", 16: "m",
  17: "p", 18: "p", 26: "p", 21: "ng",
};
const CANON_FINAL: Record<string, number> = { "": 0, k: 1, n: 4, t: 7, l: 8, m: 16, p: 17, ng: 21 };
const JONG_TO_CHO: Record<number, number> = { 1: 0, 2: 1, 4: 2, 7: 3, 8: 5, 16: 6, 17: 7, 19: 9, 20: 10, 22: 12, 23: 14, 24: 15, 25: 16, 26: 17 };
const CLUSTER: Record<number, { remain: number; moveCho: number; jamo: string; drop?: boolean }> = {
  3: { remain: 1, moveCho: 9, jamo: "ㅅ" }, 5: { remain: 4, moveCho: 12, jamo: "ㅈ" }, 6: { remain: 4, moveCho: 18, jamo: "ㅎ", drop: true },
  9: { remain: 8, moveCho: 0, jamo: "ㄱ" }, 10: { remain: 8, moveCho: 6, jamo: "ㅁ" }, 11: { remain: 8, moveCho: 7, jamo: "ㅂ" },
  12: { remain: 8, moveCho: 9, jamo: "ㅅ" }, 13: { remain: 8, moveCho: 16, jamo: "ㅌ" }, 14: { remain: 8, moveCho: 17, jamo: "ㅍ" },
  15: { remain: 8, moveCho: 18, jamo: "ㅎ", drop: true }, 18: { remain: 17, moveCho: 9, jamo: "ㅅ" },
};

const DATA: Record<string, Phrase[]> = {
  "인사": [
    { ko: "안녕하세요", roman: "annyeonghaseyo", en: "Hello" },
    { ko: "감사합니다", roman: "gamsahamnida", en: "Thank you" },
    { ko: "죄송합니다", roman: "joesonghamnida", en: "Sorry / Excuse me" },
    { ko: "네", roman: "ne", en: "Yes" },
    { ko: "아니요", roman: "aniyo", en: "No" },
  ],
  "음식·메뉴": [
    { ko: "김밥", roman: "gimbap", en: "Seaweed rice roll" },
    { ko: "불고기", roman: "bulgogi", en: "Grilled marinated beef" },
    { ko: "비빔밥", roman: "bibimbap", en: "Mixed rice bowl" },
    { ko: "김치찌개", roman: "gimchi-jjigae", en: "Kimchi stew" },
    { ko: "계산해 주세요", roman: "gyesanhae juseyo", en: "Check, please" },
  ],
  "길찾기": [
    { ko: "화장실 어디예요?", roman: "hwajangsil eodiyeyo", en: "Where is the restroom?" },
    { ko: "지하철", roman: "jihacheol", en: "Subway" },
    { ko: "여기요", roman: "yeogiyo", en: "Excuse me / Over here" },
    { ko: "왼쪽", roman: "oenjjok", en: "Left" },
    { ko: "오른쪽", roman: "oreunjjok", en: "Right" },
  ],
  "숫자": [
    { ko: "하나", roman: "hana", en: "One" },
    { ko: "둘", roman: "dul", en: "Two" },
    { ko: "셋", roman: "set", en: "Three" },
    { ko: "넷", roman: "net", en: "Four" },
    { ko: "다섯", roman: "daseot", en: "Five" },
  ],
  "급할때": [
    { ko: "도와주세요!", roman: "dowajuseyo", en: "Help!" },
    { ko: "병원", roman: "byeongwon", en: "Hospital" },
    { ko: "경찰", roman: "gyeongchal", en: "Police" },
    { ko: "아파요", roman: "apayo", en: "It hurts / I am sick" },
    { ko: "약국", roman: "yakguk", en: "Pharmacy" },
  ],
};

function decompose(ch: string): Token {
  const cp = ch.charCodeAt(0) - 0xac00;
  if (cp < 0 || cp > 11171) return { h: false, ch, original: ch };
  return { h: true, cho: Math.floor(cp / 588), jung: Math.floor((cp % 588) / 28), jong: cp % 28, original: ch };
}

function compose(t: Token): string {
  if (t.h === false) return t.ch;
  return String.fromCharCode(0xac00 + (t.cho * 21 + t.jung) * 28 + t.jong);
}

function adjacent(tokens: Token[], i: number) {
  return Boolean(tokens[i]?.h && tokens[i + 1]?.h);
}

function isVowelStart(t: Token) {
  return t.h === true && t.cho === 11;
}

function canonicalFinal(jong: number) {
  return CANON_FINAL[NEUTRAL[jong] ?? ""] ?? jong;
}

function isIOrY(jung: number) {
  return [2, 6, 7, 12, 17, 20].includes(jung);
}

function romanize(tokens: Token[]) {
  return tokens.map((t) => (t.h === true ? ROM_CHO[t.cho] + ROM_JUNG[t.jung] + (NEUTRAL[t.jong] ?? "") : t.ch)).join("");
}

function applyLiaison(tokens: Token[], links: Link[]) {
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!adjacent(tokens, i)) continue;
    const a = tokens[i] as HangulToken;
    const b = tokens[i + 1] as HangulToken;
    if (!isVowelStart(b)) continue;
    if (a.jong === 27) {
      links.push({ from: i, to: i + 1, jamo: "ㅎ", drop: true });
      a.jong = 0;
      continue;
    }
    const split = CLUSTER[a.jong];
    if (split) {
      links.push({ from: i, to: i + 1, jamo: split.jamo, drop: split.drop });
      a.jong = split.remain;
      if (!split.drop) b.cho = split.moveCho;
      continue;
    }
    if (a.jong !== 0 && a.jong !== 21 && JONG_TO_CHO[a.jong] !== undefined) {
      links.push({ from: i, to: i + 1, jamo: JONG[a.jong] });
      b.cho = JONG_TO_CHO[a.jong];
      a.jong = 0;
    }
  }
}

function applyPalatalization(tokens: Token[], links: Link[]) {
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!adjacent(tokens, i)) continue;
    const a = tokens[i] as HangulToken;
    const b = tokens[i + 1] as HangulToken;
    if ((a.jong === 7 || a.jong === 25) && b.cho === 11 && isIOrY(b.jung)) {
      links.push({ from: i, to: i + 1, jamo: JONG[a.jong] });
      b.cho = a.jong === 7 ? 12 : 14;
      a.jong = 0;
    }
  }
}

function applyNasalization(tokens: Token[]) {
  const kGroup = [1, 2, 3, 9, 24];
  const tGroup = [7, 19, 20, 22, 23, 25, 27];
  const pGroup = [17, 18, 26];
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!adjacent(tokens, i)) continue;
    const a = tokens[i] as HangulToken;
    const b = tokens[i + 1] as HangulToken;
    if (b.cho === 2 || b.cho === 6) {
      if (kGroup.includes(a.jong)) a.jong = 21;
      if (tGroup.includes(a.jong)) a.jong = 4;
      if (pGroup.includes(a.jong)) a.jong = 16;
    }
    if ((a.jong === 16 || a.jong === 21) && b.cho === 5) b.cho = 2;
  }
}

function applyFinalNeutralization(tokens: Token[]) {
  for (const token of tokens) if (token.h && token.jong !== 0) token.jong = canonicalFinal(token.jong);
}

function analyze(text: string): AnalyzeResult {
  const chars = [...text];
  const tokens = chars.map(decompose);
  const links: Link[] = [];
  applyPalatalization(tokens, links);
  applyLiaison(tokens, links);
  applyNasalization(tokens);
  applyFinalNeutralization(tokens);
  return { chars, links, hangul: tokens.map(compose).join(""), roman: romanize(tokens) };
}

let warmed = false;
function speak(text: string, rate = 0.85) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  if (!warmed) {
    const warmup = new SpeechSynthesisUtterance(" ");
    warmup.volume = 0;
    synth.speak(warmup);
    warmed = true;
  }
  if (synth.speaking) synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = rate;
  synth.speak(utterance);
}

function SoundButton({ text }: { text: string }) {
  return (
    <div className="flex shrink-0 gap-2">
      <button onClick={() => speak(text, 0.62)} className="grid h-10 w-10 place-items-center rounded-full text-[11px] font-black text-white active:scale-95" style={{ background: ACCENT }} aria-label="천천히 듣기">느림</button>
      <button onClick={() => speak(text)} className="grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white active:scale-95" style={{ background: "#1A1714" }} aria-label="보통 속도로 듣기">▶</button>
    </div>
  );
}

function LiaisonArc({ chars, links }: { chars: string[]; links: Link[] }) {
  const cell = 38;
  const row = 46;
  const arc = 34;
  const width = Math.max(chars.length * cell, 96);
  const height = row + arc;
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-[#E7E4DC] bg-[#FBFAF7] px-2 py-2">
      <div className="relative" style={{ width, height }}>
        <div className="flex" style={{ height: row }}>
          {chars.map((ch, index) => (
            <div key={`${ch}-${index}`} className="text-center text-[28px] font-bold text-[#1A1714]" style={{ width: cell, height: row, lineHeight: `${row}px`, fontFamily: KO }}>{ch === " " ? "\u00A0" : ch}</div>
          ))}
        </div>
        <svg width={width} height={height} className="pointer-events-none absolute left-0 top-0 overflow-visible">
          <defs><marker id="reader-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill={ACCENT} /></marker></defs>
          {links.map((link, index) => {
            const x1 = (link.from + 0.55) * cell;
            const x2 = (link.to + 0.5) * cell - 8;
            const mid = (x1 + x2) / 2;
            return (
              <g key={`${link.from}-${link.to}-${index}`}>
                <path d={`M ${x1} ${row - 5} Q ${mid} ${height - 2} ${x2} ${row - 5}`} fill="none" stroke={ACCENT} strokeDasharray={link.drop ? "3 3" : undefined} strokeLinecap="round" strokeWidth="1.9" markerEnd="url(#reader-arrow)" />
                <text x={mid} y={height - 2} textAnchor="middle" fontSize="12" fill={ACCENT} style={{ fontFamily: KO }}>{link.drop ? `${link.jamo}↓` : link.jamo}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function PhraseCard({ phrase, showLinks }: { phrase: Phrase; showLinks: boolean }) {
  const result = useMemo(() => analyze(phrase.ko), [phrase.ko]);
  return (
    <article className="rounded-lg border border-[#E7E4DC] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <SoundButton text={phrase.ko} />
        <div className="min-w-0 flex-1">
          <h3 className="break-keep text-[28px] font-black leading-tight text-[#1A1714]" style={{ fontFamily: KO }}>{phrase.ko}</h3>
          <div className="mt-3 rounded-lg border border-[#CFEDE7] bg-[#F0FAF8] px-3 py-2">
            <p className="break-keep text-[23px] font-black leading-tight text-[#127C71]" style={{ fontFamily: KO }}>{result.hangul}</p>
            <p className="mt-1 text-xs text-[#6f6b62]">들리는 대로</p>
          </div>
          <p className="mt-2 text-base font-bold text-[#127C71]">{phrase.roman || result.roman}</p>
          <p className="mt-1 text-sm text-[#1A1714]">{phrase.en}</p>
        </div>
      </div>
      {showLinks && result.links.length > 0 && <LiaisonArc chars={result.chars} links={result.links} />}
    </article>
  );
}

export default function KoreanReader() {
  const categories = Object.keys(DATA);
  const [category, setCategory] = useState(categories[0]);
  const [showLinks, setShowLinks] = useState(false);
  const [input, setInput] = useState("같이 가요");
  const hasHangul = /[가-힣]/.test(input);
  const custom = useMemo(() => (input.trim() && hasHangul ? analyze(input) : null), [input, hasHangul]);
  return (
    <section className="min-h-[calc(100vh-8rem)] w-full bg-[#F4F4F1] px-4 py-5 text-[#1A1714] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#127C71]">For travelers</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl" style={{ fontFamily: KO }}>한글 읽기</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f6b62]">한글을 몰라도 실제로 들리는 소리와 받침 이동을 보고 따라 읽을 수 있게 만든 여행 표현 연습장입니다.</p>
          </div>
          <button onClick={() => setShowLinks((value) => !value)} className="flex h-10 items-center justify-between gap-3 rounded-full border border-[#DCD8CF] bg-white px-4 text-sm font-bold text-[#5f5b53]">
            <span>연음 보기</span>
            <span className="relative h-6 w-11 rounded-full transition-colors" style={{ background: showLinks ? ACCENT : "#D4D0C7" }}><span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: showLinks ? 22 : 2 }} /></span>
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((name) => (
            <button key={name} onClick={() => setCategory(name)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${category === name ? "border-transparent text-white" : "border-[#DCD8CF] bg-white text-[#5f5b53] hover:border-[#127C71]"}`} style={category === name ? { background: ACCENT } : undefined}>{name}</button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {DATA[category].map((phrase) => <PhraseCard key={phrase.ko} phrase={phrase} showLinks={showLinks} />)}
        </div>
        <div className="mt-6 rounded-lg border border-[#E7E4DC] bg-white p-4 shadow-sm sm:p-5">
          <label htmlFor="reader-input" className="text-sm font-black" style={{ fontFamily: KO }}>직접 입력</label>
          <input id="reader-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="한글을 입력하세요" className="mt-2 h-12 w-full rounded-lg border border-[#E7E4DC] bg-white px-4 text-lg text-[#1A1714] outline-none focus:border-[#127C71]" style={{ fontFamily: KO }} />
          {custom && (
            <div className="mt-4 rounded-lg border border-[#CFEDE7] bg-[#F0FAF8] p-4">
              <div className="flex items-start gap-3">
                <SoundButton text={input} />
                <div className="min-w-0 flex-1">
                  <p className="break-keep text-2xl font-black text-[#127C71]" style={{ fontFamily: KO }}>{custom.hangul}</p>
                  <p className="mt-1 text-sm font-bold text-[#127C71]">{custom.roman}</p>
                </div>
              </div>
              {showLinks && custom.links.length > 0 && <LiaisonArc chars={custom.chars} links={custom.links} />}
            </div>
          )}
          {input.trim() && !hasHangul && <p className="mt-3 rounded-lg border border-dashed border-[#DCD8CF] bg-[#FBFAF7] p-3 text-sm text-[#7f796f]">영어 입력은 아직 변환하지 않아요. 이 도구는 한글을 실제 발음에 가까운 한글과 로마자로 바꾸는 학습용 엔진입니다.</p>}
        </div>
      </div>
    </section>
  );
}