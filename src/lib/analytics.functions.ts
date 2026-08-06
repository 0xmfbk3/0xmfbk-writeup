// src/lib/analytics.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function getAdminSupabase() {
  // 1. جلب الرابط (سواء كان اسمه VITE_SUPABASE_URL أو SUPABASE_URL)
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  // 2. جلب مفتاح الأدمن السري فقط! (بدون الرجوع للمفتاح العام)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  // 3. إيقاف السيرفر بخطأ صريح إذا كان المفتاح مفقوداً لتسهيل اكتشاف المشكلة
  if (!url || !key) {
    console.error("❌ ERROR: Missing Supabase Admin Key or URL in .env file.");
    throw new Error("Missing Supabase Admin Credentials");
  }

  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// schema للتحقق من المدخلات
const payloadSchema = z.object({
  path: z.string(),
  referrer: z.string().optional().default(""),
  userAgent: z.string().optional().default(""),
  threats: z
    .array(
      z.object({
        type: z.string(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        score: z.number(),
      }),
    )
    .optional()
    .default([]),
});

export const ingestTelemetry = createServerFn({ method: "POST" })
  // ✅ التعديل: استخدام validator بدلاً من inputValidator
  .validator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const sb = getAdminSupabase();
    const { path, referrer, userAgent, threats } = data;

    const request = context.request as Request | undefined;
    const clientIp =
      request?.headers.get("cf-connecting-ip") ||
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request?.headers.get("x-real-ip") ||
      "127.0.0.1";

    const ua = (userAgent || "").toLowerCase();
    const deviceType = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
    const osName = /windows/i.test(ua)
      ? "Windows"
      : /macintosh|mac os/i.test(ua)
        ? "macOS"
        : /linux/i.test(ua)
          ? "Linux"
          : /android/i.test(ua)
            ? "Android"
            : /iphone|ipad/i.test(ua)
              ? "iOS"
              : "Other";
    const browserName = /edg/i.test(ua)
      ? "Edge"
      : /firefox/i.test(ua)
        ? "Firefox"
        : /chrome/i.test(ua)
          ? "Chrome"
          : /safari/i.test(ua)
            ? "Safari"
            : "Other";

    const hashInput = `${clientIp}||${userAgent}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      hash = (hash << 5) - hash + hashInput.charCodeAt(i);
      hash |= 0;
    }
    const visitorHash = "v_" + Math.abs(hash).toString(36);

    const threatScore = threats?.length
      ? Math.min(
          100,
          threats.reduce((sum, t) => sum + t.score, 0),
        )
      : 0;

    // ✅ استخدام ISO String لتجنب مشاكل التنسيق
    const nowIso = new Date().toISOString();

    // 1️⃣ Upsert visitor ومعالجة الأخطاء
    const { error: visitorErr } = await sb.from("analytics_visitors").upsert(
      {
        visitor_hash: visitorHash,
        first_seen: nowIso,
        last_seen: nowIso,
        total_sessions: 1,
        threat_score: threatScore,
        is_blocked: false,
      },
      { onConflict: "visitor_hash" },
    );

    if (visitorErr) {
      console.error("Telemetry Error (Visitor Upsert):", visitorErr.message);
      return { success: false, error: visitorErr.message };
    }

    // 2️⃣ Insert session ومعالجة الأخطاء
    const sessionId = crypto.randomUUID();
    const { error: sessionErr } = await sb.from("analytics_sessions").insert({
      id: sessionId,
      visitor_hash: visitorHash,
      ip_address: clientIp,
      country_code: "UNKNOWN",
      user_agent: userAgent,
      device_type: deviceType,
      os_name: osName,
      browser_name: browserName,
    });

    if (sessionErr) {
      console.error("Telemetry Error (Session Insert):", sessionErr.message);
      return { success: false, error: sessionErr.message };
    }

    // 3️⃣ Insert pageview
    await sb.from("analytics_pageviews").insert({
      session_id: sessionId,
      path: path,
      referrer: referrer || "",
    });

    // 4️⃣ Insert security events
    if (threats && threats.length > 0) {
      const events = threats.map((t) => ({
        session_id: sessionId,
        ip_address: clientIp,
        event_type: t.type,
        severity: t.severity,
        payload_sample: path,
        threat_score_impact: t.score,
      }));
      await sb.from("security_events").insert(events);
    }

    return { success: true };
  });
