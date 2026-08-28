import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <div className="max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <span className="text-2xl font-bold text-muted">404</span>
        </div>
        <h2 className="mb-2 text-lg font-bold text-foreground">Page not found</h2>
        <p className="mb-6 text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-strong)] transition-colors"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
