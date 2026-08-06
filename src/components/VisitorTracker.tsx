// src/components/VisitorTracker.tsx
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function VisitorTracker() {
  useEffect(() => {
    async function trackVisitor() {
      const sessionKey = "visited_logged_session";

      // منع تكرار التسجيل خلال جلسة المتصفح
      if (sessionStorage.getItem(sessionKey)) return;

      try {
        // 1️⃣ جلب بيانات IP والموقع من Edge Function (خاصة بـ Netlify)
        const res = await fetch("/api/visitor-info");
        const geo = await res.json();

        // 2️⃣ تحليل المتصفح والجهاز محلياً
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

        // تنسيق الموقع
        const location =
          geo.city !== "غير متاح"
            ? `${geo.city}, ${geo.country}`
            : geo.country !== "غير متاح"
              ? geo.country
              : "غير متاح";

        // 3️⃣ حفظ السجل في Supabase
        const visitorRecord = {
          ip_address: geo.ip,
          location: location,
          device_info: `${device} (${os})`,
          browser: browser,
        };

        const { error } = await supabase.from("visitors_log").insert([visitorRecord]);

        if (!error) {
          sessionStorage.setItem(sessionKey, "true");
        }
      } catch (err) {
        console.error("تعذر تتبع الزائر:", err);
      }
    }

    trackVisitor();
  }, []);

  return null;
}
