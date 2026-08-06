import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Users, Globe, Monitor, RefreshCw, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/9x7ktq3f8b2a/panel/analytics")({
  head: () => ({
    meta: [{ title: "Live Visitors - 0xmfbk admin" }, { name: "robots", content: "noindex" }],
  }),
  component: RealVisitorsDashboard,
});

type VisitorLog = {
  id: string;
  created_at: string;
  ip_address: string;
  country_code: string;
  device_type: string;
  os_name: string;
  browser_name: string;
  user_agent: string;
};

function RealVisitorsDashboard() {
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);

  // 1️⃣ جلب بيانات الزوار وتصفية البوتات/IPs المحلية
  const {
    data: initialData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["real-visitors-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_sessions")
        .select(
          "id, created_at, ip_address, country_code, device_type, os_name, browser_name, user_agent",
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // فلترة تلقائية للزوار الحقيقيين فقط
      return (data as VisitorLog[]).filter((session) => {
        const ip = session.ip_address || "";
        const ua = (session.user_agent || "").toLowerCase();

        // استبعاد IP الداخلي والتطوير المحلي
        const isLocalIp =
          ip.startsWith("127.") ||
          ip.startsWith("192.168.") ||
          ip.startsWith("10.") ||
          ip === "::1";

        // استبعاد البوتات والعناكب الشهيرة
        const isBot = /bot|crawl|spider|slurp|curl|wget|python|headless/i.test(ua);

        return !isLocalIp && !isBot;
      });
    },
  });

  useEffect(() => {
    if (initialData) setVisitors(initialData);
  }, [initialData]);

  // 2️⃣ تحديث فوري (Realtime) للزوار الجدد
  useEffect(() => {
    const channel = supabase
      .channel("public:realtime_visitors")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_sessions" },
        (payload) => {
          const newSession = payload.new as VisitorLog;
          const ip = newSession.ip_address || "";
          const ua = (newSession.user_agent || "").toLowerCase();

          const isLocalIp =
            ip.startsWith("127.") ||
            ip.startsWith("192.168.") ||
            ip.startsWith("10.") ||
            ip === "::1";
          const isBot = /bot|crawl|spider|slurp|curl|wget|python|headless/i.test(ua);

          if (!isLocalIp && !isBot) {
            setVisitors((prev) => [newSession, ...prev].slice(0, 100));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-bold font-mono">Real Visitor Logs</h1>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-900 border border-gray-800 text-xs text-gray-400 hover:text-white hover:border-gray-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Visitor Counter */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-gray-400">Total Filtered Real Visitors</span>
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-400">{visitors.length}</span>
        </div>

        {/* Logs Table */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="animate-spin mx-auto h-6 w-6 text-emerald-400" />
              <p className="mt-2 text-xs text-gray-500">Loading visitors log...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900/80 text-gray-400 text-xs uppercase font-mono border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Public IP</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Device / OS</th>
                    <th className="px-4 py-3">Browser</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                  {visitors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-800/30 transition">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(v.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-400 whitespace-nowrap">
                        {v.ip_address}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-gray-500" />
                          {v.country_code || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-gray-500" />
                          <span className="capitalize">{v.device_type}</span> ({v.os_name})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {v.browser_name}
                      </td>
                    </tr>
                  ))}
                  {visitors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No real external visitors logged yet. (Local/Bot traffic filtered out)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
