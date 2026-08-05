// MDEditorClient.tsx
import { useEffect, useState, type ComponentType } from "react";
import { Globe } from "lucide-react"; // تأكد من وجود مكتبة lucide-react

type MDEditorProps = {
  value: string;
  onChange: (v: string) => void;
  height?: number;
};

export function MDEditorClient({ value, onChange, height = 560 }: MDEditorProps) {
  const [Editor, setEditor] = useState<ComponentType<any> | null>(null);
  const [isRtl, setIsRtl] = useState(true); // الوضع الافتراضي عربي

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
        className="flex items-center justify-center rounded-md border border-border bg-card/40 font-mono text-sm text-muted-foreground animate-pulse"
        style={{ height }}
      >
        <span className="text-primary/70">[ Loading Editor Workspace... ]</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* شريط التحكم العلوي */}
      <div className="flex justify-between items-center bg-card/50 px-4 py-2 rounded-md border border-border">
        <span className="text-xs font-mono text-muted-foreground tracking-wider uppercase">
          Markdown Editor
        </span>
        <button
          onClick={() => setIsRtl(!isRtl)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all duration-300 ${
            isRtl
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          title="Toggle Writing Direction"
        >
          <Globe className="w-3.5 h-3.5" />
          {isRtl ? "عربي (RTL)" : "English (LTR)"}
        </button>
      </div>

      {/* حاوية المحرر مع تطبيق الكلاس الديناميكي للتحكم بالاتجاه */}
      <div
        data-color-mode="dark"
        className={`rounded-md overflow-hidden border border-border shadow-lg ${isRtl ? "editor-rtl" : "editor-ltr"}`}
      >
        <Editor
          value={value}
          onChange={(v: string | undefined) => onChange(v ?? "")}
          height={height}
          preview="live"
          visibleDragbar={false}
          className="font-mono"
        />
      </div>
    </div>
  );
}
