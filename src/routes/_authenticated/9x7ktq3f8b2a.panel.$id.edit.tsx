import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { PostEditor, toPostForm } from "@/components/PostEditor";
import { adminGetPost } from "@/lib/posts.functions";

export const Route = createFileRoute("/_authenticated/9x7ktq3f8b2a/panel/$id/edit")({
  head: () => ({ meta: [{ title: "Edit - 0xmfbk admin" }, { name: "robots", content: "noindex" }] }),
  component: EditPost,
});

function EditPost() {
  const { id } = Route.useParams();
  const getFn = useServerFn(adminGetPost);
  const q = useQuery({ queryKey: ["admin", "post", id], queryFn: () => getFn({ data: { id } }) });

  if (q.isLoading) return <div className="p-10 text-center font-mono text-muted-foreground">loading…</div>;
  if (!q.data) throw notFound();

  return (
    <div className="min-h-screen">
      <NavBar />
      <PostEditor
        heading={
          <div>
            <p className="font-mono text-sm text-neon">$ vim writeup.md</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Edit Writeup</h1>
          </div>
        }
        initial={toPostForm(q.data)}
      />
    </div>
  );
}
