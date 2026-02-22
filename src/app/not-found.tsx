import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="text-6xl font-bold text-zinc-700">404</div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Page Not Found</h2>
        <p className="text-zinc-500 text-sm">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Link
        href="/"
        className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl active:scale-95 transition-transform"
      >
        Go Home
      </Link>
    </div>
  );
}
