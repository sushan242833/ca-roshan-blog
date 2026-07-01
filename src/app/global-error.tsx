"use client";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Something went wrong</h2>
          {error.digest && (
            <p style={{ color: "#888", fontSize: "0.875rem" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button onClick={() => unstable_retry()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
