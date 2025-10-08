"use client";
import dynamic from "next/dynamic";

const MarkdownEditor = dynamic(() => import("@/components/MarkdownEditor"), { ssr: false });
const RecorderPanel = dynamic(() => import("@/components/RecorderPanel"), { ssr: false });

export default function Page() {
  return (
    <div className="min-h-screen p-6 sm:p-10">
      <main className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4">
            <div className="mb-4 text-lg font-semibold">녹음</div>
            <RecorderPanel />
          </div>
          <div className="md:col-span-8">
            <MarkdownEditor />
          </div>
        </div>
      </main>
    </div>
  );
}


