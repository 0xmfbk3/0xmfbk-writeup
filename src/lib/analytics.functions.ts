// src/lib/analytics.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Reuse your existing public client creation logic (same as in posts.functions.ts)
function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Helper: simple visitor hash
function hashVisitor(ip: string, userAgent: string): string {
  const text = `${ip}||${userAgent}`;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return "v_" + Math.abs(hash).toString(36);
}

// Threat detection patterns
const THREAT_PATTERNS = [
  {
    type: "SQL Injection",
    regex: /(\bUNION\b\s+\bSELECT\b|\bOR\b\s+1\s*=\s*1|\bSLEEP\b\s*\(|;.*\bDROP\b)/i,
    severity: "HIGH",
    score: 60,
  },
  { type: "Path Traversal", regex: /\.\.\//, severity: "HIGH", score: 50 },
  {
    type: "XSS",
    regex: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    severity: "HIGH",
    score: 70,
  },
  { type: "Suspicious Protocol", regex: /javascript:/i, severity: "MEDIUM", score: 40 },
  { type: "System File Access", regex: /\/etc\/passwd/i, severity: "CRITICAL", score: 90 },
];

const telemetryPayloadSchema = z.object({
  path: z.string(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  country: z.string().optional(),
  threats: z
    .array(
      z.object({
        type: z.string(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        score: z.number(),
        pattern: z.string(),
      }),
    )
    .optional(),
});

export const ingestTelemetry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => telemetryPayloadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const sb = publicClient();
    const { path, referrer, userAgent, ip, country, threats } = data;

    // Use the IP from the payload or fallback to a default (the actual client IP must be extracted by the caller)
    const clientIp = ip || "127.0.0.1";
    const ua = userAgent || "";

    // Visitor hash
    const visitorHash = hashVisitor(clientIp, ua);

    // Calculate threat score
    const threatScore = threats
      ? Math.min(
          100,
          threats.reduce((sum, t) => sum + t.score, 0),
        )
      : 0;

    // Device / OS / browser parsing (simple)
    const uaLower = ua.toLowerCase();
    const deviceType = /mobile|android|iphone|ipad/i.test(uaLower) ? "mobile" : "desktop";
    const osName = /windows/i.test(uaLower)
      ? "Windows"
      : /macintosh|mac os/i.test(uaLower)
        ? "macOS"
        : /linux/i.test(uaLower)
          ? "Linux"
          : /android/i.test(uaLower)
            ? "Android"
            : /iphone|ipad/i.test(uaLower)
              ? "iOS"
              : "Other";
    const browserName = /edg/i.test(uaLower)
      ? "Edge"
      : /firefox/i.test(uaLower)
        ? "Firefox"
        : /chrome/i.test(uaLower)
          ? "Chrome"
          : /safari/i.test(uaLower)
            ? "Safari"
            : "Other";

    // Upsert visitor
    await sb.from("analytics_visitors").upsert(
      {
        visitor_hash: visitorHash,
        first_seen: new Date(),
        last_seen: new Date(),
        total_sessions: 0, // increment logic omitted for brevity
        threat_score: threatScore,
        is_blocked: false,
      },
      { onConflict: "visitor_hash", ignoreDuplicates: false },
    );

    // Insert session
    const sessionId = crypto.randomUUID();
    await sb.from("analytics_sessions").insert({
      id: sessionId,
      visitor_hash: visitorHash,
      ip_address: clientIp,
      country_code: country || "UNKNOWN",
      user_agent: ua,
      device_type: deviceType,
      os_name: osName,
      browser_name: browserName,
    });

    // Insert pageview
    await sb.from("analytics_pageviews").insert({
      session_id: sessionId,
      path: path,
      referrer: referrer || "",
    });

    // Insert security events if threats exist
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
