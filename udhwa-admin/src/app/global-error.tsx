"use client";

/** Last-resort error page (replaces the root layout, so it brings its own <html>). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f8fafc" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Udhwa Admin is having trouble</h1>
          <p style={{ color: "#475569" }}>Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "white", cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
