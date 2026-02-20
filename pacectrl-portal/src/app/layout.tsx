import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaceCtrl Portal",
  description: "Operator portal for PaceCtrl – greener ferry voyages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
