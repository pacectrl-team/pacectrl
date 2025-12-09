import Link from 'next/link';

export default function ConfirmationPage({ searchParams }: { searchParams: { date?: string } }) {
  const tripDate = searchParams?.date || 'your selected date';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f4fff7] px-6 text-center text-[#032418]">
      <h1 className="text-3xl font-semibold sm:text-4xl">We’ll keep you posted</h1>
      <p className="max-w-xl text-lg text-[#4b6b5e]">
        You will be notified about the final voted speed of your trip on {tripDate}.
      </p>
      <Link
        href="/"
        className="rounded-full bg-[#00c97e] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#00b372]"
      >
        Go to Home
      </Link>
    </main>
  );
}
