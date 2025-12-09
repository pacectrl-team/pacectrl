import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal",
  description: "Next.js + Tailwind starter"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}