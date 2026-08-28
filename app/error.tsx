"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ledger px-4 text-center">
      <p className="text-xs uppercase tracking-[0.24em] text-teal-700">Ledger fault</p>
      <h1 className="mt-3 font-serif text-4xl text-navy">Something went missing.</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The page recovered without exposing internals. Try again, or return to
        the public ledger.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-teal px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
        <Link href="/" className="rounded-full border border-border px-4 py-2 text-sm">
          Home
        </Link>
      </div>
    </div>
  );
}
