"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 text-red-500 text-2xl font-bold">
        !
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-zinc-500 text-sm">
          An unexpected error occurred. You can try again or reload the page.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl active:scale-95 transition-transform"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl border border-zinc-700 active:scale-95 transition-transform"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
