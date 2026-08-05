// MDEditorClient.tsx
import { useEffect, useState, type ComponentType } from "react";

type MDEditorProps = {
  value: string;
  onChange: (v: string) => void;
  height?: number;
};

export function MDEditorClient({ value, onChange, height = 560 }: MDEditorProps) {
  const [Editor, setEditor] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const mod = await import("@uiw/react-md-editor");
      if (mounted) setEditor(() => mod.default);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!Editor) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-border bg-card/40 font-mono text-sm text-muted-foreground"
        style={{ height }}
      >
        loading editor…
      </div>
    );
  }

  return (
    <div data-color-mode="dark" dir="auto">
      <Editor
        value={value}
        onChange={(v: string | undefined) => onChange(v ?? "")}
        height={height}
        preview="live"
        visibleDragbar={false}
      />
    </div>
  );
}
