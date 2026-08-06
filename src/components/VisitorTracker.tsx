// src/components/VisitorTracker.tsx
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function VisitorTracker() {
  useEffect(() => {
    async function trackVisitor() {
      const sessionKey = "visited_logged_session";

      if (sessionStorage.getItem(sessionKey)) {
        console.log("⏩ تم تسجيل الزيارة مسبقاً");
        return;
      }

      console.log("🟢 بدء تتبع الزائر...");

      try {
        // تحليل User-Agent (يعمل دائماً بدون CORS)
        const ua = navigator.userAgent;
        let browser = "Other";
        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";
        else if (ua.includes("Edge")) browser = "Edge";

        let device = "Desktop";
        if (/android|iphone|ipad|mobile/i.test(ua)) device = "Mobile";

        const os = ua.includes("Win")
          ? "Windows"
          : ua.includes("Mac")
            ? "Mac"
            : ua.includes("Linux")
              ? "Linux"
              : "Other OS";

        const visitorRecord = {
          ip_address: "محجوب (CORS)", // مؤقتاً – سيتم ملؤه عند النشر من الخادم
          location: "غير متاح محلياً", // نفس السبب
          device_info: `${device} (${os})`,
          browser: browser,
        };

        const { error } = await supabase.from("visitors_log").insert([visitorRecord]);

        if (error) {
          console.error("❌ فشل إدخال السجل:", error);
        } else {
          console.log("✅ تم تسجيل الزائر (بدون IP بسبب CORS)");
          sessionStorage.setItem(sessionKey, "true");
        }
      } catch (err) {
        console.error("❌ خطأ:", err);
      }
    }

    trackVisitor();
  }, []);

  return null;
}
