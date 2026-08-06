// src/components/TelemetryTracker.tsx
import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { ingestTelemetry } from "@/lib/analytics.functions";

const THREAT_PATTERNS = [
  {
    type: "SQL Injection",
    regex: /(\bUNION\b\s+\bSELECT\b|\bOR\b\s+1\s*=\s*1|\bSLEEP\b\s*\(|;.*\bDROP\b)/i,
    severity: "HIGH" as const,
    score: 60,
  },
  { type: "Path Traversal", regex: /\.\.\//, severity: "HIGH" as const, score: 50 },
  {
    type: "XSS",
    regex: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    severity: "HIGH" as const,
    score: 70,
  },
  { type: "Suspicious Protocol", regex: /javascript:/i, severity: "MEDIUM" as const, score: 40 },
  { type: "System File Access", regex: /\/etc\/passwd/i, severity: "CRITICAL" as const, score: 90 },
];

export function TelemetryTracker() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // ✅ الحل هنا: استخدام location.href بدلاً من دمج pathname مع search
    const currentPath = location.href;

    if (lastPath.current === currentPath) return;
    lastPath.current = currentPath;

    const detectedThreats = THREAT_PATTERNS.filter((pattern) =>
      pattern.regex.test(currentPath),
    ).map((t) => ({
      type: t.type,
      severity: t.severity,
      score: t.score,
    }));

    ingestTelemetry({
      data: {
        path: currentPath,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        threats: detectedThreats,
      },
    }).catch((err) => {
      console.error("Telemetry tracking failed:", err);
    });
  }, [location.href]); // ✅ تحديث المصفوفة هنا أيضاً

  return null;
}

export default TelemetryTracker;
