// src/components/CommentsSection.tsx
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ---------- helpers ----------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Remove all HTML tags – simple but effective for plain text
const sanitize = (input: string) => input.replace(/<[^>]*>/g, "").trim();

// Only Arabic and English letters + spaces
const NAME_REGEX = /^[a-zA-Z\u0600-\u06FF\s]+$/;

// Relative timestamp (e.g., "2 hours ago")
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------- types ----------
type Comment = {
  id: string;
  post_slug: string;
  author_name: string;
  content: string;
  created_at: string;
};

type Props = {
  postSlug: string;
};

export function CommentsSection({ postSlug }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState("");

  // Fetch approved comments for this slug
  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_slug", postSlug)
      .order("created_at", { ascending: false });
    if (!error && data) setComments(data as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [postSlug]);

  // Submit handler with full validation & honeypot check
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Honeypot: if the hidden field is filled, reject silently
    if (honeypot.trim().length > 0) {
      setName("");
      setContent("");
      setHoneypot("");
      return;
    }

    // 2. Sanitize inputs
    const sanitizedName = sanitize(name);
    const sanitizedContent = sanitize(content);

    // 3. Length checks
    if (sanitizedName.length < 2 || sanitizedName.length > 50) {
      setError("Name must be between 2 and 50 characters.");
      return;
    }
    if (sanitizedContent.length < 3 || sanitizedContent.length > 1000) {
      setError("Comment must be between 3 and 1000 characters.");
      return;
    }

    // 4. Strict character validation – Arabic & English letters only
    if (!NAME_REGEX.test(sanitizedName)) {
      setError("Name can only contain Arabic or English letters.");
      return;
    }
    if (!NAME_REGEX.test(sanitizedContent)) {
      setError("Comment can only contain Arabic or English letters.");
      return;
    }

    // 5. Cooldown (30 seconds)
    if (cooldown) {
      setError("Please wait 30 seconds before posting another comment.");
      return;
    }

    setSubmitting(true);

    // 6. Insert into Supabase
    const { error: insertError } = await supabase.from("comments").insert({
      post_slug: postSlug,
      author_name: sanitizedName,
      content: sanitizedContent,
    });

    if (insertError) {
      setError("Failed to submit. Please try again.");
    } else {
      setName("");
      setContent("");
      setHoneypot("");
      // Activate cooldown
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000);
      // Refresh the comments list
      fetchComments();
    }

    setSubmitting(false);
  };

  // Character counter for textarea
  const charCount = sanitize(content).length;

  return (
    <section className="mt-16 max-w-3xl mx-auto px-4">
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-8">Comments</h2>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-10 space-y-4">
        {/* Hidden honeypot – invisible to humans, detectable by bots */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="honeypot">Leave empty</label>
          <input
            type="text"
            id="honeypot"
            name="honeypot"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block font-mono text-xs text-muted-foreground mb-1" htmlFor="name">
            Name / Handle
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            required
            className="w-full rounded-md border border-border bg-card/60 px-3 py-2 font-mono text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Your name or pseudonym"
          />
        </div>

        {/* Comment textarea with char counter */}
        <div>
          <label className="block font-mono text-xs text-muted-foreground mb-1" htmlFor="comment">
            Comment
          </label>
          <textarea
            id="comment"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            required
            className="w-full rounded-md border border-border bg-card/60 px-3 py-2 font-mono text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Share your thoughts…"
          />
          <div className="flex justify-end mt-1">
            <span
              className={`font-mono text-xs ${
                charCount > 950 ? "text-danger" : "text-muted-foreground"
              }`}
            >
              {charCount} / 1000
            </span>
          </div>
        </div>

        {error && <p className="text-danger text-xs font-mono">{error}</p>}

        <button
          type="submit"
          disabled={submitting || cooldown}
          className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary/20 px-4 py-2 font-mono text-sm text-primary hover:bg-primary/30 disabled:opacity-50 transition"
        >
          {submitting ? "Submitting…" : cooldown ? "Wait 30s" : "Submit Comment"}
        </button>
      </form>

      {/* Comments list */}
      {loading ? (
        <p className="font-mono text-sm text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <ul className="space-y-6">
          {comments.map((c) => (
            <li key={c.id} className="border-b border-border/50 pb-4 last:border-0">
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {c.author_name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {timeAgo(c.created_at)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
