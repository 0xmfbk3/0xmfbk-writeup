import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function VisitorTracker() {
  useEffect(() => {
    async function trackVisitor() {
      try {
        // منع التكرار خلال جلسة المتصفح الواحدة لمنع تضخم السجلات
        const sessionKey = "visited_logged_session";
        if (sessionStorage.getItem(sessionKey)) return;

        // جلب الـ IP والموقع الجغرافي مجاناً
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        const ip = data.ip || "Unknown IP";
        const location =
          data.city && data.country_name
            ? `${data.city}, ${data.country_name}`
            : data.country_name || "Unknown Location";

        // تحليل بسيط لجهاز الزائر والمتصفح
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

        // حفظ البيانات في Supabase
        await supabase.from("visitors_log").insert([
          {
            ip_address: ip,
            location: location,
            device_info: `${device} (${os})`,
            browser: browser,
          },
        ]);

        sessionStorage.setItem(sessionKey, "true");
      } catch (err) {
        console.error("Tracking error:", err);
      }
    }

    trackVisitor();
  }, []);

  return null;
}
