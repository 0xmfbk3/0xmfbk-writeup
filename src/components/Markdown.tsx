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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Extract the language name from `hljs language-json` → `json` */
function extractLanguage(className?: string): string {
  if (!className) return "";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "";
}

/**
 * Recursively extract plain text from React children.
 * Works with strings, numbers, arrays, and valid React elements.
 */
function getNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (React.isValidElement(node)) {
    // children can be anything – recurse
    return getNodeText(node.props.children);
  }
  return "";
}

// ---------- CodeBlock ----------
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = extractLanguage(className);
  const rawCode = getNodeText(children); // plain text for the clipboard

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        {lang && (
          <span className="rounded bg-muted/70 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
            {lang}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded border border-border bg-muted/70 p-1.5 text-muted-foreground opacity-100 transition hover:text-primary
                     md:opacity-0 md:group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Copied!</span>
            </>
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {/* Only <pre> – no extra <code> tag! */}
      <pre>{children}</pre>
    </div>
  );
}

// ---------- Markdown component ----------
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-md" data-color-mode="dark" dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          // Headings with auto‑IDs for the Table of Contents
          h2: ({ children, ...props }) => {
            const id = slugifyHeading(getNodeText(children));
            return (
              <h2 id={id} {...props}>
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const id = slugifyHeading(getNodeText(children));
            return (
              <h3 id={id} {...props}>
                {children}
              </h3>
            );
          },

          // Code blocks – avoid double <code> wrapper
          pre({ children }) {
            // react‑markdown renders <pre><code>…</code></pre>
            // We only want the highlighted tokens (children of <code>)
            const codeElement = Array.isArray(children) ? children[0] : children;
            if (!React.isValidElement(codeElement)) {
              // fallback: just render as is
              return <pre>{children}</pre>;
            }

            const highlightedChildren = codeElement.props.children;
            const codeClassName = codeElement.props.className ?? "";

            return <CodeBlock className={codeClassName}>{highlightedChildren}</CodeBlock>;
          },

          // External links
          a({ href, children }) {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
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
