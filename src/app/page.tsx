"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const MarkdownEditor = dynamic(() => import("@/components/MarkdownEditor"), { ssr: false });
const RecorderPanel = dynamic(() => import("@/components/RecorderPanel"), { ssr: false });
const ResultsPanel = dynamic(() => import("@/components/ResultsPanel"), { ssr: false });

export default function Page() {
  const [transcript, setTranscript] = useState<string>("");
  return (
    <div className="min-h-screen p-6 sm:p-10">
      <main className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4">
            <div className="mb-4 text-lg font-semibold">녹음</div>
            <RecorderPanel onTranscript={setTranscript} />
          </div>
          <div className="md:col-span-8">
            <MarkdownEditor />
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 text-lg font-semibold">결과</div>
          <ResultsPanel transcript={transcript} />
        </div>
      </main>
    </div>
  );
}


