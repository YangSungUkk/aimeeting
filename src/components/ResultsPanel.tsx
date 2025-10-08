"use client";
import { useMemo, useState } from "react";

type TabKey = "stt" | "summary" | "detail";

type ResultsPanelProps = {
  transcript: string;
};

export default function ResultsPanel({ transcript }: ResultsPanelProps) {
  const [tab, setTab] = useState<TabKey>("stt");

  const summaryText = useMemo(() => {
    // 매우 간단한 요약(데모): 문장 분리 후 앞부분 몇 문장만 노출
    const sentences = transcript.split(/(?<=[.!?\u3002\uFF01\uFF1F])\s+/).filter(Boolean);
    return sentences.slice(0, 3).join(" ") || "요약할 텍스트가 없습니다.";
  }, [transcript]);

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.12] bg-background/80">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-black/[.06] dark:border-white/[.08]">
        <button
          onClick={() => setTab("stt")}
          className={`text-sm px-3 py-1 rounded ${tab === "stt" ? "bg-foreground text-background" : "border border-black/[.08] dark:border-white/[.12]"}`}
        >STT</button>
        <button
          onClick={() => setTab("summary")}
          className={`text-sm px-3 py-1 rounded ${tab === "summary" ? "bg-foreground text-background" : "border border-black/[.08] dark:border-white/[.12]"}`}
        >요약</button>
        <button
          onClick={() => setTab("detail")}
          className={`text-sm px-3 py-1 rounded ${tab === "detail" ? "bg-foreground text-background" : "border border-black/[.08] dark:border-white/[.12]"}`}
        >상세</button>
      </div>
      <div className="p-4 text-sm leading-6" style={{ color: "var(--foreground)" }}>
        {tab === "stt" && (
          <div className="whitespace-pre-wrap break-words min-h-[120px]">{transcript || "실시간 텍스트가 여기에 표시됩니다."}</div>
        )}
        {tab === "summary" && (
          <div className="whitespace-pre-wrap break-words min-h-[120px]">{summaryText}</div>
        )}
        {tab === "detail" && (
          <div className="space-y-2">
            <div className="text-foreground/70 text-xs">문장 단위 분해</div>
            <ul className="list-disc pl-5 space-y-1">
              {transcript
                .split(/(?<=[.!?\u3002\uFF01\uFF1F])\s+/)
                .filter(Boolean)
                .map((s, i) => (
                  <li key={i} className="break-words">{s}</li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}


