// src/routes/_authenticated/9x7ktq3f8b2a.panel.analytics.tsx
import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Activity, Globe, Shield, Users, RefreshCw, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/9x7ktq3f8b2a/panel/analytics")({
  head: () => ({
    meta: [{ title: "Security Analytics - 0xmfbk admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AnalyticsDashboard,
});

type SecurityEvent = {
  id: string;
  created_at: string;
  ip_address: string;
  event_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  payload_sample: string | null;
  session_id: string | null;
};

type KpiData = {
  totalVisitors: number;
  totalSessions: number;
  totalPageviews: number;
  threatRatio: number;
  anonymizers: number;
  topCountries: { country: string; count: number }[];
};

function AnalyticsDashboard() {
  const [mode, setMode] = useState<"executive" | "forensic">("executive");
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const queryClient = useQueryClient();

  // Helper to get `since` timestamp
  const getSince = (range: string) => {
    const now = new Date();
    switch (range) {
      case "1h":
        return new Date(now.getTime() - 3600_000).toISOString();
      case "24h":
        return new Date(now.getTime() - 86400_000).toISOString();
      case "7d":
        return new Date(now.getTime() - 7 * 86400_000).toISOString();
    }
  };

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ["analytics", "kpi", timeRange],
    queryFn: async () => {
      const since = getSince(timeRange);
      const [
        { count: visitors },
        { count: sessions },
        { count: pageviews },
        { data: threats },
        { data: geo },
        { data: anonymizerData },
      ] = await Promise.all([
        supabase
          .from("analytics_visitors")
          .select("*", { count: "exact", head: true })
          .gte("last_seen", since),
        supabase
          .from("analytics_sessions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since),
        supabase
          .from("analytics_pageviews")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since),
        supabase.from("security_events").select("severity").gte("created_at", since),
        supabase
          .from("analytics_sessions")
          .select("country_code")
          .gte("created_at", since)
          .not("country_code", "is", null),
        supabase
          .from("analytics_sessions")
          .select("is_vpn,is_proxy,is_tor,is_datacenter")
          .gte("created_at", since),
      ]);

      const threatCount = threats?.length || 0;
      const sessionCount = sessions || 0;
      const threatRatio = sessionCount > 0 ? (threatCount / sessionCount) * 100 : 0;

      // Top countries
      const countryCounts: Record<string, number> = {};
      geo?.forEach((s) => {
        const c = s.country_code || "UNKNOWN";
        countryCounts[c] = (countryCounts[c] || 0) + 1;
      });
      const topCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, count]) => ({ country, count }));

      // Anonymizers count
      const anonymizers =
        anonymizerData?.filter((s) => s.is_vpn || s.is_proxy || s.is_tor).length || 0;

      return {
        totalVisitors: visitors || 0,
        totalSessions: sessionCount,
        totalPageviews: pageviews || 0,
        threatRatio,
        anonymizers,
        topCountries,
      } as KpiData;
    },
  });

  const { data: eventsData } = useQuery({
    queryKey: ["analytics", "events", timeRange, severityFilter],
    queryFn: async () => {
      const since = getSince(timeRange);
      let query = supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .gte("created_at", since);
      if (severityFilter !== "ALL") query = query.eq("severity", severityFilter);
      const { data } = await query.limit(50);
      return data as SecurityEvent[];
    },
  });

  useEffect(() => {
    if (eventsData) setEvents(eventsData);
  }, [eventsData]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("public:security_events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "security_events" },
        (payload) => {
          const newEvent = payload.new as SecurityEvent;
          if (severityFilter === "ALL" || newEvent.severity === severityFilter) {
            setEvents((prev) => [newEvent, ...prev].slice(0, 50));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [severityFilter, supabase]);

  const severityColor = (s: string) => {
    switch (s) {
      case "LOW":
        return "bg-green-500/20 text-green-400";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400";
      case "HIGH":
        return "bg-orange-500/20 text-orange-400";
      case "CRITICAL":
        return "bg-red-500/20 text-red-400";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold font-mono">
            <Shield className="inline-block mr-2 h-6 w-6 text-emerald-400" />
            Threat Intelligence & Analytics
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("executive")}
              className={`px-3 py-1 rounded text-sm font-medium ${mode === "executive" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"}`}
            >
              Executive View
            </button>
            <button
              onClick={() => setMode("forensic")}
              className={`px-3 py-1 rounded text-sm font-medium ${mode === "forensic" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"}`}
            >
              Forensic View
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        {kpiLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto h-6 w-6 text-emerald-400" />
            <p className="mt-2 text-sm text-gray-400">Loading intelligence...</p>
          </div>
        ) : (
          <>
            {mode === "executive" && kpi && (
              <div>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Users className="h-4 w-4" /> Visitors
                    </div>
                    <p className="text-2xl font-bold mt-1">{kpi.totalVisitors}</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Activity className="h-4 w-4" /> Sessions
                    </div>
                    <p className="text-2xl font-bold mt-1">{kpi.totalSessions}</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <AlertTriangle className="h-4 w-4" /> Threat Ratio
                    </div>
                    <p className="text-2xl font-bold mt-1">{kpi.threatRatio.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Globe className="h-4 w-4" /> Anonymizers
                    </div>
                    <p className="text-2xl font-bold mt-1">{kpi.anonymizers}</p>
                  </div>
                </div>

                {/* Top Countries */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Geo Locations</h3>
                  <div className="space-y-2">
                    {kpi.topCountries.map((c) => (
                      <div key={c.country} className="flex justify-between text-sm">
                        <span>{c.country}</span>
                        <span className="text-gray-400">{c.count} sessions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Threat Feed */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-300">
                  {mode === "forensic" ? "Live Incident Feed" : "Recent Threats"}
                </h3>
                <span className="text-xs text-gray-500">Realtime</span>
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="text-gray-400 text-left">
                    <tr>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">IP</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Severity</th>
                      {mode === "forensic" && <th className="pb-2">Payload</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt) => (
                      <tr key={evt.id} className="border-t border-gray-800">
                        <td className="py-2 text-xs text-gray-500">
                          {new Date(evt.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-2 font-mono text-xs">{evt.ip_address}</td>
                        <td className="py-2 text-xs">{evt.event_type}</td>
                        <td className="py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${severityColor(evt.severity)}`}
                          >
                            {evt.severity}
                          </span>
                        </td>
                        {mode === "forensic" && (
                          <td className="py-2 text-xs max-w-[200px] truncate font-mono text-gray-500">
                            {evt.payload_sample}
                          </td>
                        )}
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No security events detected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
