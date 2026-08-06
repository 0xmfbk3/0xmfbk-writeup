// src/routes/__root.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TelemetryTracker } from "@/components/TelemetryTracker";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center font-mono">
        <p className="text-neon text-sm">$ cat /404</p>
        <h1 className="mt-2 text-7xl font-bold tracking-tighter">404</h1>
        <p className="mt-3 text-muted-foreground">segment not found in this route table.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition"
        >
          → return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-danger">$ stderr</p>
        <h1 className="mt-2 text-2xl font-bold">Something crashed.</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20"
        >
          retry
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "google-site-verification", content: "jYMjOUT89DRqEYLCHEwhWLe2K_I-PE4soU9cvHZl_I0" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "referrer", content: "same-origin" },
      { title: "0xmfbk.sec - Writeups" },
      {
        name: "description",
        content:
          "Writeups, notes and tools by Mustafa Faek Banikhalaf offensive & defensive security, web pentesting, Python tooling, log analysis.",
      },
      { name: "author", content: "Mustafa Faek Banikhalaf" },
      { property: "og:title", content: "0xmfbk.sec - Writeups" },
      {
        property: "og:description",
        content:
          "Writeups, notes and tools by Mustafa Faek Banikhalaf offensive & defensive security, web pentesting, Python tooling, log analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0b1220" },
      { name: "twitter:title", content: "0xmfbk.sec - Writeups" },
      {
        name: "twitter:description",
        content:
          "Writeups, notes and tools by Mustafa Faek Banikhalaf offensive & defensive security, web pentesting, Python tooling, log analysis.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0f4e4c3b-b430-4da6-affe-e7399e552990/id-preview-eb0812e9--e12f81bd-94e1-43d3-b485-9e2c6708d065.lovable.app-1784073812809.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0f4e4c3b-b430-4da6-affe-e7399e552990/id-preview-eb0812e9--e12f81bd-94e1-43d3-b485-9e2c6708d065.lovable.app-1784073812809.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/img.png", type: "image/png" },
      { rel: "icon", href: "/img.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/img.png", sizes: "192x192", type: "image/png" },
      { rel: "apple-touch-icon", href: "/img.png" },
      { rel: "shortcut icon", href: "/img.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <TelemetryTracker />
      <Outlet />
      <Toaster theme="dark" position="top-right" richColors />
    </QueryClientProvider>
  );
}
