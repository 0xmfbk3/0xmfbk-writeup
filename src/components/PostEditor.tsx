// src/components/PostEditor.tsx
import { useState, type ReactNode, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { MDEditorClient } from "@/components/MDEditorClient";
import { Markdown } from "@/components/Markdown";
import { adminSavePost } from "@/lib/posts.functions";
import { Save, Eye, Pin, Trash2, AlertTriangle } from "lucide-react";
import { AMMAN_TZ, ammanLocalToUtcISO, utcISOToAmmanLocalInput, formatAmman } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client"; // existing Supabase client

export type PostStatus = "draft" | "published" | "scheduled" | "archived";

export type PostForm = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string;
  cover_image_url: string;
  status: PostStatus;
  scheduled_for_local: string;
  is_pinned: boolean;
  order_index: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function toPostForm(p: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  tags: string[];
  cover_image_url: string | null;
  status: PostStatus | string;
  scheduled_for: string | null;
  is_pinned: boolean;
  order_index: number;
}): PostForm {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? "",
    content: p.content ?? "",
    tags: (p.tags ?? []).join(", "),
    cover_image_url: p.cover_image_url ?? "",
    status: (p.status as PostStatus) ?? "draft",
    scheduled_for_local: utcISOToAmmanLocalInput(p.scheduled_for),
    is_pinned: !!p.is_pinned,
    order_index: p.order_index ?? 0,
  };
}

// Comment type for moderation
type Comment = {
  id: string;
  post_slug: string;
  author_name: string;
  content: string;
  created_at: string;
};

export function PostEditor({ initial, heading }: { initial: PostForm; heading: ReactNode }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<PostForm>(initial);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const saveFn = useServerFn(adminSavePost);

  // ---- Comment moderation state ----
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState(false);

  const fetchComments = async () => {
    if (!form.slug) return;
    setLoadingComments(true);
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_slug", form.slug)
      .order("created_at", { ascending: false });
    if (!error && data) setComments(data as Comment[]);
    setLoadingComments(false);
  };

  // Reload comments when slug changes
  useEffect(() => {
    fetchComments();
  }, [form.slug]);

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      toast.error("Failed to delete comment.");
    } else {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted.");
    }
  };

  const handlePurgeAll = async () => {
    const { error } = await supabase.from("comments").delete().eq("post_slug", form.slug);
    if (error) {
      toast.error("Failed to purge comments.");
    } else {
      setComments([]);
      setPurgeConfirm(false);
      toast.success("All comments deleted.");
    }
  };

  const mut = useMutation({
    mutationFn: () => {
      if (form.status === "scheduled" && !form.scheduled_for_local) {
        throw new Error("Pick a schedule date (Asia/Amman) or change the status.");
      }
      return saveFn({
        data: {
          id: form.id,
          title: form.title.trim(),
          slug: form.slug.trim() || slugify(form.title),
          excerpt: form.excerpt.trim() || null,
          content: form.content,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          cover_image_url: form.cover_image_url.trim() || null,
          status: form.status,
          scheduled_for:
            form.status === "scheduled" ? ammanLocalToUtcISO(form.scheduled_for_local) : null,
          is_pinned: form.is_pinned,
          order_index: Number(form.order_index) || 0,
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved.");
      navigate({ to: "/9x7ktq3f8b2a/panel" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const scheduledPreview =
    form.status === "scheduled" && form.scheduled_for_local
      ? formatAmman(ammanLocalToUtcISO(form.scheduled_for_local))
      : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {heading}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs hover:text-accent"
          >
            <Eye className="h-4 w-4" /> {mode === "edit" ? "preview only" : "back to editor"}
          </button>
          <button
            type="button"
            disabled={mut.isPending || !form.title.trim()}
            onClick={() => mut.mutate()}
            className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary/20 px-4 py-2 font-mono text-sm text-primary hover:bg-primary/30 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {mut.isPending ? "saving…" : "save"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-mono text-xs text-muted-foreground">title</label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                  slug: form.slug || slugify(e.target.value),
                })
              }
              placeholder="XSS in the wild: bypassing WAFs with Unicode"
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-lg font-semibold focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-mono text-xs text-muted-foreground">slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="my-writeup"
                className="w-full rounded-md border border-border bg-card/60 px-3 py-2 font-mono text-sm focus:border-primary/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs text-muted-foreground">
                tags (comma separated)
              </label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="web, xss, waf"
                className="w-full rounded-md border border-border bg-card/60 px-3 py-2 font-mono text-sm focus:border-primary/60 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between font-mono text-xs text-muted-foreground">
              <span>excerpt</span>
              <span className={form.excerpt.length > 500 ? "text-red-500" : "opacity-60"}>
                {form.excerpt.length} / 500
              </span>
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={2}
              maxLength={500}
              placeholder="Short summary used on cards and social share."
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm focus:border-primary/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between font-mono text-xs text-muted-foreground">
              <span>content (markdown — GFM)</span>
              <span className="opacity-60">{form.content.length.toLocaleString()} chars</span>
            </label>
            {mode === "edit" ? (
              <MDEditorClient
                value={form.content}
                onChange={(v) => setForm({ ...form, content: v })}
              />
            ) : (
              <div className="rounded-md border border-border bg-card/60 p-6">
                <Markdown content={form.content} />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {/* Status & scheduling card */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">status</h3>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as PostStatus })}
              className="mt-2 w-full rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-sm focus:border-primary/60 focus:outline-none"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="scheduled">scheduled</option>
              <option value="archived">archived</option>
            </select>

            {form.status === "scheduled" && (
              <div className="mt-3">
                <label className="mb-1 block font-mono text-xs text-muted-foreground">
                  release time ({AMMAN_TZ})
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_for_local}
                  onChange={(e) => setForm({ ...form, scheduled_for_local: e.target.value })}
                  className="w-full rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-sm focus:border-primary/60 focus:outline-none"
                />
                {scheduledPreview && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    goes live: <span className="text-neon">{scheduledPreview}</span>
                  </p>
                )}
              </div>
            )}

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              <Pin className="h-3.5 w-3.5" /> pin to top
            </label>

            <label className="mt-3 block font-mono text-xs text-muted-foreground">
              order index
            </label>
            <input
              type="number"
              value={form.order_index}
              onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-sm focus:border-primary/60 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Higher = shown first. Default 0.
            </p>
          </div>

          {/* Cover image card */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">cover image</h3>
            <input
              value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              placeholder="https://…"
              className="mt-2 w-full rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-xs focus:border-primary/60 focus:outline-none"
            />
            {form.cover_image_url && (
              <img
                src={form.cover_image_url}
                alt=""
                className="mt-3 rounded border border-border"
              />
            )}
          </div>

          {/* ===== Comments Moderation Card ===== */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">
              Comments ({comments.length})
            </h3>

            {loadingComments ? (
              <p className="mt-2 text-xs text-muted-foreground font-mono">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground font-mono">No comments yet.</p>
            ) : (
              <>
                <ul className="mt-3 space-y-3 max-h-[300px] overflow-y-auto toc-scrollbar">
                  {comments.map((c) => (
                    <li key={c.id} className="border-b border-border/50 pb-2 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {c.author_name}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {c.content}
                      </p>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="mt-1 flex items-center gap-1 text-[10px] text-danger hover:underline font-mono"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Purge all button */}
                <div className="mt-3 border-t border-border/50 pt-3">
                  {!purgeConfirm ? (
                    <button
                      onClick={() => setPurgeConfirm(true)}
                      className="flex items-center gap-1 text-xs text-danger hover:underline font-mono"
                    >
                      <AlertTriangle className="h-3 w-3" /> Delete all comments
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-danger font-mono">Sure?</span>
                      <button
                        onClick={handlePurgeAll}
                        className="px-2 py-0.5 text-xs rounded bg-danger/20 text-danger font-mono hover:bg-danger/30"
                      >
                        Purge all
                      </button>
                      <button
                        onClick={() => setPurgeConfirm(false)}
                        className="px-2 py-0.5 text-xs rounded border border-border text-muted-foreground font-mono hover:bg-muted/30"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
