import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  adminListAllPosts,
  adminDeletePost,
  adminReorderPosts,
  checkIsAdmin,
} from "@/lib/posts.functions";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/NavBar";
import { formatAmman } from "@/lib/timezone";
import { Plus, Pencil, Trash2, LogOut, ShieldAlert, GripVertical, Pin, PinOff, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/9x7ktq3f8b2a/panel/")({
  head: () => ({
    meta: [{ title: "Dashboard - 0xmfbk admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminDashboard,
});

type Row = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "archived";
  is_pinned: boolean;
  is_published: boolean;
  order_index: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
  scheduled_for: string | null;
};

const STEP = 10;

function statusBadge(s: Row["status"]) {
  const map: Record<Row["status"], string> = {
    published: "bg-primary/15 text-primary",
    scheduled: "bg-accent/15 text-accent",
    draft: "bg-muted text-muted-foreground",
    archived: "bg-danger/15 text-danger",
  };
  return `rounded px-2 py-0.5 font-mono text-[10px] uppercase ${map[s]}`;
}

function SortableRow({
  post,
  onDelete,
  onTogglePin,
  disabled,
}: {
  post: Row;
  onDelete: (p: Row) => void;
  onTogglePin: (p: Row) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 border-t border-border bg-card/40 px-3 py-3 first:border-t-0 hover:bg-card/70"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="drag to reorder"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{post.title}</span>
          <span className={statusBadge(post.status)}>{post.status}</span>
          {post.is_pinned && (
            <span className="inline-flex items-center gap-1 rounded bg-neon/15 px-2 py-0.5 font-mono text-[10px] text-neon">
              <Pin className="h-2.5 w-2.5" /> pinned
            </span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
          /{post.slug}
          {post.status === "scheduled" && post.scheduled_for && (
            <>
              {" "}
              ·{" "}
              <span className="text-accent">
                releases {formatAmman(post.scheduled_for, "yyyy-MM-dd HH:mm")}
              </span>
            </>
          )}
          {post.status === "published" && post.published_at && (
            <> · published {formatAmman(post.published_at, "yyyy-MM-dd")}</>
          )}
        </div>
      </div>

      <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
        #{post.order_index}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onTogglePin(post)}
          title={post.is_pinned ? "Unpin" : "Pin to top"}
          className="rounded border border-border p-1.5 font-mono text-xs hover:border-neon/60 hover:text-neon"
        >
          {post.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <Link
          to="/9x7ktq3f8b2a/panel/$id/edit"
          params={{ id: post.id }}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-xs hover:border-accent/50 hover:text-accent"
        >
          <Pencil className="h-3 w-3" /> edit
        </Link>
        <button
          onClick={() => onDelete(post)}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-xs hover:border-danger/50 hover:text-danger"
        >
          <Trash2 className="h-3 w-3" /> del
        </button>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAllPosts);
  const delFn = useServerFn(adminDeletePost);
  const meFn = useServerFn(checkIsAdmin);
  const reorderFn = useServerFn(adminReorderPosts);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => meFn({}) });
  const postsQ = useQuery({
    queryKey: ["admin", "posts"],
    queryFn: () => listFn({}) as Promise<Row[]>,
    enabled: !!meQ.data?.isAdmin,
  });

  // Local ordering copy for optimistic DnD.
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (postsQ.data) setRows(postsQ.data);
  }, [postsQ.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorder = useMutation({
    mutationFn: (updates: { id: string; order_index: number; is_pinned: boolean }[]) =>
      reorderFn({ data: { updates } }),
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "posts"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
      toast.success("Deleted.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const pinnedRows = useMemo(() => rows.filter((r) => r.is_pinned), [rows]);
  const standardRows = useMemo(() => rows.filter((r) => !r.is_pinned), [rows]);

  function commitOrder(next: Row[]) {
    // Assign order_index within each group with a step of STEP, descending.
    const withOrder = next.map((r, i, arr) => {
      const groupItems = arr.filter((x) => x.is_pinned === r.is_pinned);
      const posInGroup = groupItems.findIndex((x) => x.id === r.id);
      const order_index = (groupItems.length - posInGroup) * STEP;
      return { ...r, order_index };
    });
    setRows(withOrder);
    reorder.mutate(
      withOrder.map((r) => ({ id: r.id, order_index: r.order_index, is_pinned: r.is_pinned })),
    );
  }

  function handleDragEnd(group: "pinned" | "standard") {
    return (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const list = group === "pinned" ? pinnedRows : standardRows;
      const oldIndex = list.findIndex((r) => r.id === active.id);
      const newIndex = list.findIndex((r) => r.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const nextGroup = arrayMove(list, oldIndex, newIndex);
      const nextAll =
        group === "pinned" ? [...nextGroup, ...standardRows] : [...pinnedRows, ...nextGroup];
      commitOrder(nextAll);
    };
  }

  function togglePin(p: Row) {
    // Optimistic: flip is_pinned and re-batch. Uses reorder endpoint (batch update).
    const nextAll = rows.map((r) => (r.id === p.id ? { ...r, is_pinned: !r.is_pinned } : r));
    // Move flipped row to top of its new group.
    const flipped = nextAll.find((r) => r.id === p.id)!;
    const rest = nextAll.filter((r) => r.id !== p.id);
    const pinned = rest.filter((r) => r.is_pinned);
    const standard = rest.filter((r) => !r.is_pinned);
    const arranged = flipped.is_pinned
      ? [flipped, ...pinned, ...standard]
      : [...pinned, flipped, ...standard];
    commitOrder(arranged);
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/9x7ktq3f8b2a/gate", replace: true });
  }

  if (meQ.isLoading) {
    return (
      <div className="p-10 text-center font-mono text-muted-foreground">verifying credentials…</div>
    );
  }

  if (meQ.data && !meQ.data.isAdmin) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-danger" />
          <h1 className="mt-4 text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is authenticated but lacks the <code>admin</code> role.
          </p>
          <button
            onClick={signOut}
            className="mt-6 rounded-md border border-border px-4 py-2 font-mono text-xs hover:text-primary"
          >
            sign out
          </button>
        </div>
      </div>
    );
  }

  const dragDisabled = reorder.isPending;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Writeups Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/9x7ktq3f8b2a/panel/new"
              className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary/20 px-4 py-2 font-mono text-sm text-primary hover:bg-primary/30"
            >
              <Plus className="h-4 w-4" /> new writeup
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:text-danger"
            >
              <LogOut className="h-4 w-4" /> exit
            </button>
          </div>
        </div>

        {postsQ.isLoading ? (
          <div className="rounded-xl border border-border p-8 text-center font-mono text-sm text-muted-foreground">
            loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center font-mono text-sm text-muted-foreground">
            // no writeups yet — create your first one
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 font-mono text-xs uppercase text-neon">📌 pinned</h2>
              <div className="overflow-hidden rounded-xl border border-border">
                {pinnedRows.length === 0 ? (
                  <div className="p-4 text-center font-mono text-xs text-muted-foreground">
                    // nothing pinned
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd("pinned")}
                  >
                    <SortableContext
                      items={pinnedRows.map((r) => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {pinnedRows.map((p) => (
                        <SortableRow
                          key={p.id}
                          post={p}
                          onDelete={(row) => {
                            if (confirm(`Delete "${row.title}"?`)) del.mutate(row.id);
                          }}
                          onTogglePin={togglePin}
                          disabled={dragDisabled}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-mono text-xs uppercase text-muted-foreground">
                all writeups
              </h2>
              <div className="overflow-hidden rounded-xl border border-border">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd("standard")}
                >
                  <SortableContext
                    items={standardRows.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {standardRows.map((p) => (
                      <SortableRow
                        key={p.id}
                        post={p}
                        onDelete={(row) => {
                          if (confirm(`Delete "${row.title}"?`)) del.mutate(row.id);
                        }}
                        onTogglePin={togglePin}
                        disabled={dragDisabled}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
