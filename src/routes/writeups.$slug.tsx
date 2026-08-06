// src/routes/writeups.$slug.tsx
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { ShareButton } from "@/components/ShareButton";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TableOfContents } from "@/components/TableOfContents";
import { BackToTop } from "@/components/BackToTop";
import { readingTime } from "@/lib/readingTime";
import { getPublishedPostBySlug } from "@/lib/posts.functions";
import { CommentsSection } from "@/components/CommentsSection";

export const Route = createFileRoute("/writeups/$slug")({
  loader: ({ params }) => getPublishedPostBySlug({ data: { slug: params.slug } }),
  component: WriteupPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center font-mono text-danger">{error.message}</div>
  ),
  head: ({ data }) => ({
    meta: data
      ? [
          { title: data.title },
          { name: "description", content: data.excerpt ?? "" },
          { property: "og:title", content: data.title },
          { property: "og:description", content: data.excerpt ?? "" },
        ]
      : [],
  }),
});

function WriteupPage() {
  const post = Route.useLoaderData();
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const date = post?.created_at
    ? new Date(post.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  if (!post) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="font-mono text-lg text-muted-foreground">writeup not found.</p>
      </div>
    );
  }

  return (
    <>
      <ReadingProgress />
      <BackToTop />

      <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
            {date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {date}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readingTime(post.content)} min read
            </span>
            <ShareButton url={shareUrl} title={post.title} excerpt={post.excerpt ?? ""} />
          </div>
        </motion.header>

        {/* Content + ToC sidebar */}
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-10">
          <div className="min-w-0">
            <Markdown content={post.content} />
          </div>

          {/* === FIXED ToC Sidebar === */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto toc-scrollbar">
              <TableOfContents content={post.content} />
            </div>
          </aside>
        </div>
        <CommentsSection postSlug={post.slug} />
      </article>
    </>
  );
}
