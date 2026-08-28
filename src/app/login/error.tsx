"use client";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <div className="max-w-sm w-full">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white">
            HR
          </span>
          <h1 className="text-xl font-bold tracking-tight">HRIS HR Portal</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mb-2 text-base font-bold text-foreground">Connection issue</h2>
          <p className="mb-4 text-sm text-muted">
            {error.message || "Unable to connect to the server. Please try again."}
          </p>
          {error.digest && (
            <p className="mb-4 text-xs text-muted-light">Error ID: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="w-full rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-strong)] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
