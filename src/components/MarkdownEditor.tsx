import { useMemo, useState } from "react";

function escapeHtml(input: string): string {
  return input
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;");
}

function renderMarkdown(src: string): string {
  // 매우 간단한 마크다운 렌더러 (헤딩/볼드/이탤릭/체크박스 목록/순서없는 목록/인라인 코드/링크/수평선/문단)
  const safe = escapeHtml(src);
  const lines = safe.split(/\r?\n/);
  const htmlLines: string[] = [];

  for (const line of lines) {
    // 수평선
    if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      htmlLines.push("<hr/>");
      continue;
    }

    // 헤딩 # ~ ######
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      htmlLines.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // 체크박스 목록 - [ ] / - [x]
    const todoMatch = line.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (todoMatch) {
      const checked = /x/i.test(todoMatch[1]);
      const content = todoMatch[2];
      htmlLines.push(
        `<div class="flex items-start gap-2"><input type="checkbox" disabled ${
          checked ? "checked" : ""
        }/><span>${content}</span></div>`
      );
      continue;
    }

    // 순서 없는 목록
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      htmlLines.push(`<li>${ulMatch[1]}</li>`);
      continue;
    }

    // 일반 텍스트는 후처리용 표시
    htmlLines.push(`§P§${line}`);
  }

  const html = htmlLines
    .join("\n")
    // 목록 래핑 (<li>들을 <ul>로 감싸기)
    .replace(/(?:^|\n)(<li>[\s\S]*?<\/li>)(?=\n(?!<li>)|$)/g, (m) => `<ul class="list-disc pl-6 space-y-1">${m.replaceAll("\n", "")}</ul>`)
    // 인라인 코드
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black\/\[0.06\] dark:bg-white\/\[0.08\]">$1<\/code>')
    // 볼드 **text**
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // 이탤릭 *text*
    .replace(/(^|\W)\*([^*]+)\*/g, "$1<em>$2</em>")
    // 링크 [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">$1<\/a>')
    // 문단 래핑 (§P§ 표시를 <p>로)
    .replace(/(?:^|\n)§P§(.*?)(?=\n|$)/g, (m, g1) => `<p>${g1 || "&nbsp;"}<\/p>`);

  return html;
}

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

  const html = useMemo(() => renderMarkdown(value), [value]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="text-xl font-semibold">회의 메모</div>
        <div className="text-sm text-foreground/60 mt-1">마크다운으로 작성하고 오른쪽에서 즉시 미리보기</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-black/[.08] dark:border-white/[.12] overflow-hidden">
          <div className="px-3 py-2 text-xs text-foreground/60 border-b border-black/[.06] dark:border-white/[.08]">Markdown 입력</div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full h-[360px] md:h-[520px] p-3 bg-background text-foreground outline-none resize-none"
            placeholder="# 제목\n- [ ] 할 일\n내용을 작성하세요"
          />
        </div>
        <div className="rounded-xl border border-black/[.08] dark:border-white/[.12] overflow-hidden">
          <div className="px-3 py-2 text-xs text-foreground/60 border-b border-black/[.06] dark:border-white/[.08]">미리보기</div>
          <div
            className="prose prose-neutral dark:prose-invert max-w-none p-4"
            style={{ color: "var(--foreground)" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}


