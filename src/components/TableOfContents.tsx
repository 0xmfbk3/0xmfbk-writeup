// src/components/TableOfContents.tsx
import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
  children: TocItem[];
};

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// تحويل العناوين المسطحة إلى هيكل شجري (Tree) لترتيب h3 تحت h2
function extractHierarchicalToc(markdown: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const flatItems: { id: string; text: string; level: 2 | 3 }[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length as 2 | 3;
    const text = match[2].trim();
    const id = slugifyHeading(text);
    if (id) {
      flatItems.push({ id, text, level });
    }
  }

  const tree: TocItem[] = [];
  let currentH2: TocItem | null = null;

  flatItems.forEach((item) => {
    if (item.level === 2) {
      currentH2 = { ...item, children: [] };
      tree.push(currentH2);
    } else if (item.level === 3) {
      if (currentH2) {
        currentH2.children.push({ ...item, children: [] });
      } else {
        // Fallback لو وُجد h3 بدون h2 قبله
        tree.push({ ...item, children: [] });
      }
    }
  });

  return tree;
}

export function TableOfContents({ content }: { content: string }) {
  const toc = useMemo(() => extractHierarchicalToc(content), [content]);
  const [activeId, setActiveId] = useState<string>("");
  // حالة تخزين الأقسام المفتوحة يدوياً أو تلقائياً
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // تتبع العنوان النشط أثناء التمرير
  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveId(id);

            // البحث التلقائي عن الـ H2 الأب وفتحه تلقائياً إذا كان الـ ID يتبع له
            toc.forEach((h2) => {
              const isChild = h2.children.some((h3) => h3.id === id);
              if (h2.id === id || isChild) {
                setOpenSections((prev) => ({ ...prev, [h2.id]: true }));
              }
            });
          }
        });
      },
      { rootMargin: "-80px 0px -50% 0px", threshold: 0.1 },
    );

    // مراقبة كل العناوين الرئيسية والفرعية
    toc.forEach((h2) => {
      const el = document.getElementById(h2.id);
      if (el) observer.observe(el);
      h2.children.forEach((h3) => {
        const h3El = document.getElementById(h3.id);
        if (h3El) observer.observe(h3El);
      });
    });

    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  const toggleSection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav dir="rtl" className="space-y-2 font-mono text-xs text-right">
      <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold">
            محتويات المقال
          </h4>
        </div>
        <span className="text-[10px] text-muted-foreground/60">{toc.length} أقسام</span>
      </div>

      <ul className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto toc-scrollbar pl-1">
        {toc.map((h2) => {
          const isH2Active = activeId === h2.id;
          const hasChildren = h2.children.length > 0;
          const isOpen = openSections[h2.id] ?? isH2Active; // مفتوح إذا كان نشطاً أو افتراضياً

          return (
            <li key={h2.id} className="space-y-1">
              <div
                className={`group relative flex items-center justify-between rounded-md px-2 py-1.5 transition-all duration-200 ${
                  isH2Active
                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <a
                  href={`#${h2.id}`}
                  className="flex-1 truncate text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(h2.id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActiveId(h2.id);
                  }}
                >
                  {h2.text}
                </a>

                {/* مؤشر نشط سايبراني */}
                {isH2Active && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-primary rounded-l-full shadow-[0_0_8px_var(--primary)]"></span>
                )}

                {/* زر الطي والتوسيع (Collapse / Expand) للعناوين التي تمتلك فروعاً */}
                {hasChildren && (
                  <button
                    type="button"
                    onClick={(e) => toggleSection(h2.id, e)}
                    className="p-1 text-muted-foreground/70 hover:text-foreground transition-transform duration-200"
                    aria-label="Toggle section"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronLeft className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* العناوين الفرعية (h3) تظهر فقط إذا كان القسم مفتوحاً */}
              {hasChildren && isOpen && (
                <ul className="space-y-1 pr-3 border-r border-border/40 my-1">
                  {h2.children.map((h3) => {
                    const isH3Active = activeId === h3.id;
                    return (
                      <li key={h3.id} className="relative">
                        <a
                          href={`#${h3.id}`}
                          className={`block truncate rounded-md px-2 py-1 text-[11px] transition-all ${
                            isH3Active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/30"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            document
                              .getElementById(h3.id)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            setActiveId(h3.id);
                          }}
                        >
                          {isH3Active && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-primary rounded-l-full"></span>
                          )}
                          {h3.text}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
