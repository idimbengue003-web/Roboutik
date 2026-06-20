"use client";

import { useEffect } from "react";

/**
 * Client-side error tracker.
 * Captures window.onerror and unhandledrejection events,
 * sends them to /api/errors for server-side logging + admin notification.
 *
 * Mount this component once in the root layout.
 */
export function ClientErrorTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const captureError = (payload: {
      message: string;
      stack?: string;
      severity?: "low" | "medium" | "high" | "critical";
      metadata?: Record<string, unknown>;
    }) => {
      try {
        // Don't log dev errors (React StrictMode double-rendering, etc.)
        if (process.env.NODE_ENV === "development") return;

        const body = {
          message: payload.message,
          stack: payload.stack,
          severity: payload.severity ?? "medium",
          path: window.location.pathname,
          userAgent: navigator.userAgent,
          metadata: payload.metadata,
        };

        // Use navigator.sendBeacon for fire-and-forget (works on page unload)
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(body)], {
            type: "application/json",
          });
          navigator.sendBeacon("/api/errors", blob);
        } else {
          fetch("/api/errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Don't infinite loop on logging errors
      }
    };

    const onErrorHandler = (
      message: string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      captureError({
        message: message || "JavaScript error",
        stack: error?.stack || `at ${source}:${lineno}:${colno}`,
        severity: "high",
      });
    };

    const onRejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      captureError({
        message:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection",
        stack: reason instanceof Error ? reason.stack : undefined,
        severity: "medium",
      });
    };

    window.addEventListener("error", onErrorHandler as EventListener);
    window.addEventListener("unhandledrejection", onRejectionHandler);

    return () => {
      window.removeEventListener("error", onErrorHandler as EventListener);
      window.removeEventListener("unhandledrejection", onRejectionHandler);
    };
  }, []);

  return null;
}
