'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <header className="w-full border-b border-[#8bd4ab] bg-[#e1ffe7]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-sm uppercase tracking-[0.3em] text-[#025239]">
          <strong>PACECTRL</strong>
        </span>
        <div className="flex items-center gap-6 text-sm uppercase tracking-[0.3em] text-[#025239]">
          <div className="hidden items-center gap-5 tracking-normal md:flex">
            <Link href="/" className="text-xs uppercase text-[#025239] transition hover:text-[#00a86b]">
              Book
            </Link>
            <Link href="#about" className="text-xs uppercase text-[#025239] transition hover:text-[#00a86b]">
              About
            </Link>
            <Link href="/login" className="text-xs uppercase text-[#025239] transition hover:text-[#00a86b]">
              Login
            </Link>
            <Link href="/signup" className="text-xs uppercase text-[#025239] transition hover:text-[#00a86b]">
              Sign Up
            </Link>
          </div>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen((prev) => !prev)}
            className="flex flex-col gap-1 md:hidden"
          >
            <span className="h-0.5 w-6 bg-[#025239]" />
            <span className="h-0.5 w-6 bg-[#025239]" />
            <span className="h-0.5 w-6 bg-[#025239]" />
          </button>
        </div>
      </nav>
      {isNavOpen && (
        <div className="border-t border-[#8bd4ab] bg-[#f0fff2] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.2em] text-[#025239]">
            <Link href="/" className="hover:text-[#4dffb5]">
              Book
            </Link>
            <Link href="#about" className="hover:text-[#4dffb5]">
              About
            </Link>
            <Link href="/login" className="hover:text-[#4dffb5]">
              Login
            </Link>
            <Link href="/signup" className="hover:text-[#4dffb5]">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
