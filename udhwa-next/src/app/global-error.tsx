"use client";

/** Last-resort error page (replaces the root layout, so it brings its own <html>). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#fbfaf7", color: "#1c1917" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Udhwa is having trouble</h1>
          <p style={{ color: "#57534e" }}>Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #d6d3d1", background: "white", cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
