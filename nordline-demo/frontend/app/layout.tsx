import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NordLine Ferries",
  description:
    "Book your Baltic & Bothnian sea crossing with NordLine — the greener way to travel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* ── Global header ── */}
        <header className="bg-nordline-blue text-white shadow-md">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              {/* Simple wave + ferry icon */}
              <span className="text-3xl">⛴</span>
              <div>
                <span className="text-xl font-bold tracking-tight">NordLine</span>
                <span className="block text-xs text-blue-200 font-medium -mt-0.5">
                  FERRIES
                </span>
              </div>
            </a>
            <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-blue-100">
              <a href="/" className="hover:text-white transition-colors">
                Routes
              </a>
              <a href="#" className="hover:text-white transition-colors">
                My Bookings
              </a>
              <a href="#" className="hover:text-white transition-colors">
                About
              </a>
            </nav>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1">{children}</main>

        {/* ── Footer ── */}
        <footer className="bg-nordline-blue text-blue-200 text-xs text-center py-6 px-4">
          <p>
            © 2026 NordLine Ferries AB — This is a{" "}
            <strong className="text-white">demo site</strong> for the{" "}
            <a
              href="https://pacectrl.up.railway.app/"
              className="underline hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              PaceCtrl
            </a>{" "}
            eco-speed widget integration.
          </p>
        </footer>
      </body>
    </html>
  );
}
