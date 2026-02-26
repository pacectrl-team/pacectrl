import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <p className="text-5xl mb-6">⛵</p>
      <h1 className="text-2xl font-bold text-nordline-blue mb-3">
        Page not found
      </h1>
      <p className="text-gray-500 mb-8">
        This page has sailed away. Let&apos;s get you back on course.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-nordline-blue px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        ← Back to routes
      </Link>
    </div>
  );
}
