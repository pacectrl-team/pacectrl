'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const SPEED_OPTIONS = [
  { value: 0, label: 'Slow', gradient: ['#a5f3c5', '#00c97e'], co2: 'Saves 35% CO₂', time: '+30 min' },
  { value: 1, label: 'Medium', gradient: ['#ffe9a0', '#ffb347'], co2: 'Saves 20% CO₂', time: '+15 min' },
  { value: 2, label: 'Fast', gradient: ['#ff9a8b', '#ff4d4d'], co2: 'Saves 5% CO₂', time: '+0 min' },
];

const STEPS = ['Journey', 'Date & Time', 'Speed', 'Review'];

export default function BookingStepper() {
  const [journey, setJourney] = useState('Helsinki to Tallin');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [speedLevel, setSpeedLevel] = useState(1);
  const [activeStep, setActiveStep] = useState(0);
  const router = useRouter();

  const activeSpeed = SPEED_OPTIONS[speedLevel];
  const gradientStyle = {
    background: `linear-gradient(135deg, ${activeSpeed.gradient[0]}, ${activeSpeed.gradient[1]})`,
  };
  const sliderCompletion = (speedLevel / (SPEED_OPTIONS.length - 1)) * 100;

  const goNext = () => setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const goBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));
  const handleBook = () => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    router.push(`/confirmation${params.toString() ? `?${params}` : ''}`);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="rounded-2xl border border-[#c8f3d8] bg-white p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00a86b]">Step 1</p>
            <h2 className="mt-2 text-lg font-semibold">Choose your journey</h2>
            <select
              value={journey}
              onChange={(e) => setJourney(e.target.value)}
              className="mt-4 w-full rounded-xl border border-[#8bd4ab] bg-white px-4 py-3 text-sm text-[#032418] outline-none focus:ring-2 focus:ring-[#00c97e]"
            >
              <option value="Helsinki to Tallin">Helsinki to Tallin</option>
              <option value="Helsinki to Stockholm">Helsinki to Stockholm</option>
              <option value="Kokkola to Tankar">Kokkola to Tankar</option>
              <option value="Vaasa to Umeå">Vaasa to Umeå</option>
            </select>
          </div>
        );
      case 1:
        return (
          <div className="rounded-2xl border border-[#c8f3d8] bg-white p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00a86b]">Step 2</p>
            <h2 className="mt-2 text-lg font-semibold">Choose date and time</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-[#8bd4ab] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00c97e]"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-xl border border-[#8bd4ab] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00c97e]"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="rounded-3xl p-6 text-white shadow-xl md:p-8" style={gradientStyle}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em]">Step 3</p>
            <h2 className="mt-2 text-lg font-semibold">Vote the speed for your journey</h2>
            <div className="relative mt-6">
              <div className="h-2 w-full rounded-full bg-white/30">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${sliderCompletion}%`, backgroundColor: activeSpeed.gradient[1] }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={speedLevel}
                onChange={(e) => setSpeedLevel(Number(e.target.value))}
                className="absolute inset-[-10px] h-6 w-full appearance-none bg-transparent focus:outline-none
                  [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                  [&::-webkit-slider-thumb]:bg-[#032418] [&::-webkit-slider-thumb]:shadow-lg
                  [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#032418]"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.3em]">
              {SPEED_OPTIONS.map((option) => (
                <span key={option.value} className={option.value === speedLevel ? 'font-semibold' : 'opacity-70'}>
                  {option.label}
                </span>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-white/20 px-4 py-3 text-sm backdrop-blur">
              <p>{activeSpeed.co2}</p>
              <p className="text-white/80">Added time: {activeSpeed.time}</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="rounded-2xl border border-[#c8f3d8] bg-white p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00a86b]">Step 4</p>
            <h2 className="mt-2 text-lg font-semibold">Review &amp; book</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <strong>Route:</strong> {journey}
              </p>
              <p>
                <strong>Date:</strong> {date || 'Select a date'}
              </p>
              <p>
                <strong>Time:</strong> {time || 'Select a time'}
              </p>
              <p>
                <strong>Speed:</strong> {activeSpeed.label}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <section className="w-full max-w-4xl space-y-6 text-left">
      <ol className="flex items-center gap-4 overflow-x-auto rounded-full border border-[#c8f3d8] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em]">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                index === activeStep ? 'bg-[#00c97e] text-white' : 'bg-[#e6fff1] text-[#00a86b]'
              }`}
            >
              {index + 1}
            </span>
            <span className={index === activeStep ? 'text-[#032418]' : 'text-[#6ca48a]'}>{label}</span>
            {index < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-[#c8f3d8]" />}
          </li>
        ))}
      </ol>
      {renderStepContent()}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          onClick={goBack}
          disabled={activeStep === 0}
          className="rounded-full border border-[#8bd4ab] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#025239] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        {activeStep < STEPS.length - 1 ? (
          <button
            onClick={goNext}
            className="rounded-full bg-[#00c97e] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#00b372]"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleBook}
            className="rounded-full bg-[#032418] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white"
          >
            Book journey
          </button>
        )}
      </div>
    </section>
  );
}
