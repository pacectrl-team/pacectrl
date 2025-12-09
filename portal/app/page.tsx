import React from 'react';
import Header from '../components/layout/Header';
import BookingStepper from '../components/booking/BookingStepper';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f4fff7] text-[#032418]">
      <Header />
      <main className="flex flex-col items-center gap-10 px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold text-[#032418] sm:text-6xl">
          <span className="block">Choose your pace</span>
          <span className="block">Shape your impact</span>
        </h1>
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#00a86b]">
          Choose your speed
        </p>
        <BookingStepper />
      </main>
    </div>
  );
}