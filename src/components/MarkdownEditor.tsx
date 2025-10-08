import { useState } from "react";

export default function MarkdownEditor() {
  const [value, setValue] = useState<string>(
    [
      "# 회의 메모",
      "",
      "- [ ] 안건 A 검토",
      "- [x] 자료 공유 (완료)",
      "",
      "## 결론",
      "핵심 포인트를 **굵게** 표시하고, 필요시 *기울임*을 사용하세요.",
    ].join("\n")
  );

  return (
    <div className="w-full">
      <div className="rounded-xl border border-black/[.08] dark:border-white/[.12] overflow-hidden min-h-[260px]">
        <div className="px-3 py-2 text-xs text-foreground/60 border-b border-black/[.06] dark:border-white/[.08]">Markdown 메모</div>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full h-[260px] p-3 bg-background text-foreground outline-none resize-none font-mono"
          placeholder="# 제목\n- [ ] 할 일\n내용을 작성하세요"
        />
      </div>
    </div>
  );
}


