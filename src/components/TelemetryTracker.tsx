// src/components/TelemetryTracker.tsx
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { ingestTelemetry } from "@/lib/analytics.functions";

export function TelemetryTracker() {
  const router = useRouter();

  useEffect(() => {
    // Send telemetry on initial load and on route changes
    const sendTelemetry = async () => {
      // Perform client-side threat scanning (patterns on URL)
      const url = window.location.pathname + window.location.search;
      const threats: Array<{
        type: string;
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        score: number;
        pattern: string;
      }> = [];
      const patterns = [
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
        {
          type: "Suspicious Protocol",
          regex: /javascript:/i,
          severity: "MEDIUM" as const,
          score: 40,
        },
        {
          type: "System File Access",
          regex: /\/etc\/passwd/i,
          severity: "CRITICAL" as const,
          score: 90,
        },
      ];
      patterns.forEach((p) => {
        if (p.regex.test(url)) {
          threats.push({ ...p, pattern: p.regex.source });
        }
      });

      try {
        await ingestTelemetry({
          data: {
            path: window.location.pathname,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            ip: "", // The server function can extract the real IP from request headers (context) – leave empty for now; we can trust server context.
            country: "", // same
            threats,
          },
        });
      } catch (err) {
        console.error("Telemetry error:", err);
      }
    };

    // Send on mount and on every route change
    sendTelemetry();
    const unsub = router.subscribe("onLoad", () => {
      sendTelemetry();
    });
    return () => unsub();
  }, [router]);

  return null; // invisible
}
