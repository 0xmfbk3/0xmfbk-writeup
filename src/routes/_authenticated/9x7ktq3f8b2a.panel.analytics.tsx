import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Users, Trash2, RefreshCw, Globe, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/9x7ktq3f8b2a/panel/analytics")({
  head: () => ({
    meta: [{ title: "Visitors Logs - Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: SimpleVisitorsPanel,
});

type VisitorRow = {
  id: string;
  created_at: string;
  ip_address: string;
  location: string;
  device_info: string;
  browser: string;
};

function SimpleVisitorsPanel() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 1️⃣ جلب سجلات الزوار
  const {
    data: visitors = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["visitors_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitors_log")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VisitorRow[];
    },
  });

  // 2️⃣ حذف فردي أو جماعي من Supabase مباشرة
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("visitors_log").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors_log"] });
      setSelectedIds([]);
    },
  });

  // تحديد الكل أو إلغاء التحديد
  const toggleSelectAll = () => {
    if (selectedIds.length === visitors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visitors.map((v) => v.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-bold font-mono">Visitors Logs Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={() => deleteMutation.mutate(selectedIds)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded hover:bg-red-600/30 text-xs transition font-mono"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 text-gray-400 rounded hover:text-white text-xs transition font-mono"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Counter Widget */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 mb-6 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield className="h-4 w-4 text-emerald-400" /> Total Logged Visitors
          </div>
          <span className="text-xl font-bold text-emerald-400">{visitors.length}</span>
        </div>

        {/* Table */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 font-mono text-xs">Loading logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-900/80 text-gray-400 uppercase border-b border-gray-800">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={visitors.length > 0 && selectedIds.length === visitors.length}
                        onChange={toggleSelectAll}
                        className="accent-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Public IP</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Device / OS</th>
                    <th className="px-3 py-3">Browser</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {visitors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-800/30 transition">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(v.id)}
                          onChange={() => toggleSelectOne(v.id)}
                          className="accent-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(v.created_at).toLocaleTimeString()} -{" "}
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 font-semibold text-emerald-400 whitespace-nowrap">
                        {v.ip_address}
                      </td>
                      <td className="px-3 py-3 text-gray-300 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-gray-500" /> {v.location}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-300 whitespace-nowrap">{v.device_info}</td>
                      <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{v.browser}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => deleteMutation.mutate([v.id])}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition rounded hover:bg-red-500/10"
                          title="Delete Row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visitors.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        No visitor logs available. Open your site in a new tab to generate a log!
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
