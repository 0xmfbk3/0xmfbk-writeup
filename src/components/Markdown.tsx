// src/components/Markdown.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

// ---------- helpers ----------
function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-") // دعم الأحرف العربية في الروابط
    .replace(/(^-|-$)/g, "");
}

function extractLanguage(className?: string): string {
  if (!className) return "";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "";
}

function getNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (React.isValidElement(node)) {
    return getNodeText(node.props.children);
  }
  return "";
}

// ---------- CodeBlock ----------
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = extractLanguage(className);
  const rawCode = getNodeText(children);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-6 overflow-hidden rounded-lg border border-border/50 bg-[#0d1117] shadow-md">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        {lang && (
          <span className="rounded bg-background/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            {lang}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-transparent bg-background/50 px-2 py-1 text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/50 hover:text-primary md:opacity-0 md:group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-[10px] font-bold text-green-400">Copied</span>
            </>
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {/* إجبار الكود البرمجي على اليسار دائماً */}
      <pre className="overflow-x-auto p-4 text-left font-mono text-sm leading-relaxed" dir="ltr">
        {children}
      </pre>
    </div>
  );
}

// ---------- Markdown component ----------
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-md max-w-none" data-color-mode="dark" dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          h2: ({ children, ...props }) => {
            const id = slugifyHeading(getNodeText(children));
            return (
              <h2
                id={id}
                className="scroll-mt-24 text-2xl font-bold text-foreground mt-8 mb-4"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const id = slugifyHeading(getNodeText(children));
            return (
              <h3
                id={id}
                className="scroll-mt-24 text-xl font-semibold text-foreground/90 mt-6 mb-3"
                {...props}
              >
                {children}
              </h3>
            );
          },
          pre({ children }) {
            const codeElement = Array.isArray(children) ? children[0] : children;
            if (!React.isValidElement(codeElement)) {
              return (
                <pre dir="ltr" className="text-left">
                  {children}
                </pre>
              );
            }
            const highlightedChildren = codeElement.props.children;
            const codeClassName = codeElement.props.className ?? "";
            return <CodeBlock className={codeClassName}>{highlightedChildren}</CodeBlock>;
          },
          a({ href, children }) {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="text-primary hover:underline underline-offset-4 decoration-primary/50 transition-colors"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
