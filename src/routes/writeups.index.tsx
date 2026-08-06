import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { WriteupsList } from "@/components/WriteupsList";
import { listPublishedPosts } from "@/lib/posts.functions";

export const Route = createFileRoute("/writeups/")({
  loader: () => listPublishedPosts(),
  head: () => ({
    meta: [
      { title: "Writeups — 0xmfbk" },
      { name: "description", content: "All security writeups, notes and research by 0xmfbk." },
      { property: "og:title", content: "Writeups - 0xmfbk" },
      { property: "og:description", content: "All security writeups, notes and research by 0xmfbk." },
    ],
  }),
  component: WriteupsPage,
  errorComponent: ({ error }) => <div className="p-10 text-center text-danger">{error.message}</div>,
});

function WriteupsPage() {
  const posts = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">All Writeups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {posts.length} {posts.length === 1 ? "entry" : "entries"}.
          </p>
        </div>
        <WriteupsList posts={posts} />
      </main>
    </div>
  );
}
