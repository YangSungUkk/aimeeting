import { useCallback, useMemo, useRef, useState } from "react";

type BlockType = "paragraph" | "heading" | "todo";

type EditorBlock = {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function NoteEditor() {
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    { id: generateId(), type: "heading", text: "회의 메모" },
    { id: generateId(), type: "paragraph", text: "여기에 회의 중 메모를 자유롭게 작성하세요." },
  ]);

  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setRef = useCallback((id: string, el: HTMLDivElement | null) => {
    blockRefs.current[id] = el;
  }, []);

  const handleEnter = useCallback((index: number) => {
    setBlocks(prev => {
      const current = prev[index];
      const newBlock: EditorBlock = { id: generateId(), type: current.type === "heading" ? "paragraph" : current.type, text: "" };
      const next = [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)];
      return next;
    });
    setTimeout(() => {
      const next = blocks[index + 1];
      if (next) blockRefs.current[next.id]?.focus();
    }, 0);
  }, [blocks]);

  const handleBackspaceAtStart = useCallback((index: number) => {
    setBlocks(prev => {
      if (index === 0) return prev;
      const current = prev[index];
      const prevBlock = prev[index - 1];
      const mergedText = (prevBlock.text || "") + (current.text || "");
      const merged: EditorBlock = { ...prevBlock, text: mergedText };
      const next = [...prev];
      next.splice(index - 1, 2, merged);
      return next;
    });
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, checked: !b.checked } : b)));
  }, []);

  const applySlashCommand = useCallback((index: number, cmd: string) => {
    setBlocks(prev => {
      const target = prev[index];
      let type: BlockType = target.type;
      if (cmd === "h1") type = "heading";
      if (cmd === "todo") type = "todo";
      if (cmd === "p") type = "paragraph";
      const replaced: EditorBlock = { ...target, type, checked: type === "todo" ? false : undefined };
      return [...prev.slice(0, index), replaced, ...prev.slice(index + 1)];
    });
  }, []);

  const renderBlock = useCallback((block: EditorBlock, index: number) => {
    const isHeading = block.type === "heading";
    const isTodo = block.type === "todo";

    return (
      <div
        key={block.id}
        ref={el => setRef(block.id, el)}
        className="group flex items-start gap-2 px-3 py-2 rounded-md hover:bg-black/[0.03] dark:hover:bg-white/[0.04] focus:outline-none"
        tabIndex={0}
        role="textbox"
        aria-label={isHeading ? "제목" : isTodo ? "체크리스트" : "문단"}
        contentEditable
        suppressContentEditableWarning
        onInput={e => {
          const text = (e.currentTarget.textContent || "").replace(/^\s+/, "");
          setBlocks(prev => prev.map(b => (b.id === block.id ? { ...b, text } : b)));
        }}
        onKeyDown={e => {
          const selection = window.getSelection();
          const isCaretAtStart = selection && selection.anchorOffset === 0;
          if (e.key === "Enter") {
            e.preventDefault();
            handleEnter(index);
          } else if (e.key === "Backspace" && isCaretAtStart) {
            e.preventDefault();
            handleBackspaceAtStart(index);
          } else if (e.key === "/") {
            // 간단한 슬래시 명령 프롬프트
            const hint = "명령 입력 (h1, todo, p)";
            setTimeout(() => {
              const cmd = window.prompt(hint) || "";
              if (cmd) applySlashCommand(index, cmd.trim());
            }, 0);
          }
        }}
        style={{
          minHeight: isHeading ? 40 : 28,
        }}
      >
        {isTodo ? (
          <span className="mt-1 select-none">
            <input
              type="checkbox"
              checked={!!block.checked}
              onChange={() => toggleTodo(block.id)}
              className="h-4 w-4 accent-foreground"
            />
          </span>
        ) : (
          <span className="mt-1 w-4 h-4 opacity-0 group-hover:opacity-100 cursor-grab select-none">⋮⋮</span>
        )}
        <span
          className={
            isHeading
              ? "font-semibold text-xl leading-7"
              : isTodo
              ? "line-clamp-none"
              : "leading-7"
          }
          style={{ color: "var(--foreground)" }}
        >
          {block.text}
        </span>
      </div>
    );
  }, [applySlashCommand, handleBackspaceAtStart, handleEnter, setRef, toggleTodo]);

  const editor = useMemo(() => (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-3 text-xs text-foreground/60 px-3">/ 입력으로 h1, todo, p 전환</div>
      <div
        className="rounded-xl border border-black/[.08] dark:border-white/[.12] bg-background/80 backdrop-blur p-2"
        style={{ color: "var(--foreground)" }}
      >
        {blocks.map((b, i) => renderBlock(b, i))}
      </div>
    </div>
  ), [blocks, renderBlock]);

  return editor;
}


