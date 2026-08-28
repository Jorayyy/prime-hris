"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F8FAFC",
          padding: "1.5rem",
        }}>
          <div style={{
            maxWidth: "24rem",
            width: "100%",
            borderRadius: "1rem",
            border: "1px solid #E2E8F0",
            background: "#FFFFFF",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)",
          }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1E293B", marginBottom: "0.5rem" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#64748B", marginBottom: "1.5rem" }}>
              {error.message || "An unexpected error occurred."}
            </p>
            {error.digest && (
              <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginBottom: "1rem" }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: "#3B82F6",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "0.875rem",
                padding: "0.625rem 1.25rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
