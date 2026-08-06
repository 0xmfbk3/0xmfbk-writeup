// src/lib/visitor.functions.ts
import { createServerFn } from "@tanstack/react-start";

export const getVisitorInfo = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  // context.request هو Request الأصلي (متاح في TanStack Start)
  const request = context.request as Request;

  // استخراج IP الحقيقي
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  // استدعاء ipapi.co من الخادم (لا CORS)
  let ipData: any = {};
  try {
    const res = await fetch(`https://ipapi.co/${clientIp}/json/`);
    ipData = await res.json();
  } catch {
    // إذا فشل، استمر بقيم افتراضية
  }

  // تحليل User-Agent
  const ua = request.headers.get("user-agent") || "";

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

  return {
    ip: ipData.ip || clientIp,
    location:
      ipData.city && ipData.country_name
        ? `${ipData.city}, ${ipData.country_name}`
        : ipData.country_name || "Unknown Location",
    device_info: `${device} (${os})`,
    browser: browser,
  };
});
