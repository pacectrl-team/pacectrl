"use client";

/**
 * Booking page for a specific NordLine ferry trip.
 *
 * Flow:
 *  1. Page renders with trip details (ship, schedule, price).
 *  2. PaceCtrl widget script loads and the slider is initialised.
 *  3. When the passenger adjusts the slider and confirms, `onIntentCreated`
 *     fires and we store the latest `intent_id` in React state.
 *  4. The passenger fills in a name + email (demo only — not persisted).
 *  5. On "Pay", a loading overlay shows while we:
 *       a. Call our FastAPI backend `/api/confirm-booking` with the intent_id
 *          (if one exists — slider interaction is optional).
 *       b. Backend forwards it to PaceCtrl confirmed-choices via webhook secret.
 *  6. A success screen shows the booking reference.
 */

import { use, useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { getTripById, PACECTRL_PUBLIC_KEY, type Trip } from "@/lib/trips";

// The PaceCtrl widget registers itself on window
declare global {
  interface Window {
    PaceCtrlWidget: {
      init: (options: {
        container: string | HTMLElement;
        externalTripId?: string;
        publicKey?: string;
        apiBaseUrl?: string;
        onIntentCreated?: (intent: { intent_id: string; [key: string]: unknown }) => void;
      }) => void;
    };
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function BookingPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const trip = getTripById(tripId);

  if (!trip) {
    return <TripNotFound />;
  }

  return <BookingFlow trip={trip} />;
}

// ---------------------------------------------------------------------------
// Main booking flow
// ---------------------------------------------------------------------------
function BookingFlow({ trip }: { trip: Trip }) {
  // The latest intent ID created by the PaceCtrl widget slider
  const [latestIntentId, setLatestIntentId] = useState<string | null>(null);
  // Whether the widget JS bundle has loaded and been initialised
  const [widgetReady, setWidgetReady] = useState(false);
  // Stores the externalTripId that was last successfully initialised.
  // Using the ID (instead of a boolean) ensures that even when React StrictMode
  // runs effects twice, or when navigating back to the same trip, init() is
  // only called once per unique trip.
  const widgetInitialised = useRef<string | null>(null);

  // Pre-filled demo passengers — one per route so each view looks lived-in
  const DEMO_PASSENGERS: Record<string, { name: string; email: string }> = {
    "vsa-ume": { name: "Testi Testaaja",  email: "testi.testaaja@testi.fi" },
    "tku-sto": { name: "Average Joe",     email: "average.joe@test.com" },
    "hel-tll": { name: "Demo Demonen",    email: "demo@demonen.fi" },
    "sto-rix": { name: "Test Testsson",   email: "test.testsson@example.se" },
  };
  const demo = DEMO_PASSENGERS[trip.id] ?? { name: "Average Joe", email: "joe@tester.fi" };

  // Passenger form state (demo only — not sent to any backend)
  const [passengerName, setPassengerName] = useState(demo.name);
  const [passengerEmail, setPassengerEmail] = useState(demo.email);

  // Payment state machine
  type PaymentState = "idle" | "loading" | "success" | "error";
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Called by the Script component's onLoad — initialises the widget.
  // externalTripId and publicKey are passed explicitly (same pattern as
  // widget-demo.html) so there is no ambiguity about which voyage to load.
  const handleScriptLoad = useCallback(() => {
    // Guard: skip if this exact trip was already initialised
    if (widgetInitialised.current === trip.externalTripId) return;
    widgetInitialised.current = trip.externalTripId;

    window.PaceCtrlWidget.init({
      container: "#pace-widget",
      externalTripId: trip.externalTripId,
      publicKey: PACECTRL_PUBLIC_KEY,
      onIntentCreated(intent) {
        console.info("[NordLine] PaceCtrl intent created:", intent);
        setLatestIntentId(intent.intent_id);
      },
    });

    setWidgetReady(true);
  }, [trip.externalTripId]);

  // Re-init when the trip changes (e.g. user navigates to another booking page).
  // If the widget script is already cached in the browser we call init directly
  // instead of waiting for onLoad, which only fires on the first script load.
  // The trip-ID guard inside handleScriptLoad prevents double-fetching even
  // when React StrictMode runs this effect twice in development.
  useEffect(() => {
    setLatestIntentId(null);
    setWidgetReady(false);

    if (typeof window !== "undefined" && window.PaceCtrlWidget) {
      handleScriptLoad();
    }
  }, [trip.id, handleScriptLoad]);

  // ── Pay handler ──────────────────────────────────────────────────────────
  const handlePay = async () => {
    setPaymentState("loading");
    setErrorMessage(null);

    try {
      // Add a small artificial delay to simulate payment gateway round-trip
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // If the passenger interacted with the widget, confirm the speed choice
      if (latestIntentId) {
        const backendUrl =
          process.env.NEXT_PUBLIC_BOOKING_BACKEND_URL ?? "http://localhost:8000";

        const res = await fetch(`${backendUrl}/api/confirm-booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent_id: latestIntentId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { detail?: string }).detail ??
              `Backend returned ${res.status}`
          );
        }

        const data = (await res.json()) as { booking_id: string };
        setBookingRef(data.booking_id);
      } else {
        // No widget interaction — generate a client-side booking reference for
        // demo purposes (a real system would call its own booking service)
        setBookingRef(`NL-${Math.random().toString(36).slice(2, 10).toUpperCase()}`);
      }

      setPaymentState("success");
    } catch (err) {
      console.error("[NordLine] Payment error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setPaymentState("error");
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (paymentState === "success" && bookingRef) {
    return (
      <SuccessScreen
        trip={trip}
        bookingRef={bookingRef}
        passengerName={passengerName}
        intentCaptured={!!latestIntentId}
      />
    );
  }

  // Bundle the layout context so we don't thread 10 props everywhere
  const ctx: LayoutCtx = {
    trip,
    latestIntentId,
    widgetReady,
    passengerName,
    passengerEmail,
    setPassengerName,
    setPassengerEmail,
    payState: paymentState,
    errorMsg: errorMessage,
    handlePay,
  };

  // Each trip gets its own visual identity
  let Layout: React.FC<{ ctx: LayoutCtx }>;
  if (trip.id === "vsa-ume")       Layout = LayoutScandinavian;
  else if (trip.id === "tku-sto")  Layout = LayoutNight;
  else if (trip.id === "hel-tll")  Layout = LayoutCity;
  else                             Layout = LayoutPremium;

  return (
    <>
      <Layout ctx={ctx} />
      <Script
        src={`${process.env.NEXT_PUBLIC_BOOKING_BACKEND_URL || "http://localhost:8000"}/widget.js`}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
    </>
  );
}

// ── Shared layout context ────────────────────────────────────────────────
type PayState = "idle" | "loading" | "success" | "error";
interface LayoutCtx {
  trip: Trip;
  latestIntentId: string | null;
  widgetReady: boolean;
  passengerName: string;
  passengerEmail: string;
  setPassengerName: (v: string) => void;
  setPassengerEmail: (v: string) => void;
  payState: PayState;
  errorMsg: string | null;
  handlePay: () => void;
}

// ==========================================================================
// LAYOUT A — Vaasa → Umeå
// Bright Scandinavian daylight feel. Two-column layout.
// Widget sits directly above the Pay button — a natural last step before
// confirming the booking.
// ==========================================================================
function LayoutScandinavian({ ctx }: { ctx: LayoutCtx }) {
  const { trip } = ctx;
  const canPay = ctx.passengerName.trim() && ctx.passengerEmail.trim();
  return (
    <div className="min-h-screen bg-[#f5f9fc]">
      <div className="bg-[#0a3d62] text-white py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-blue-300 text-sm hover:text-white mb-3 inline-block">← All routes</Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-blue-300 text-sm mb-1">{trip.flags} · {trip.date}</p>
              <h1 className="text-3xl font-extrabold">{trip.from} → {trip.to}</h1>
              <p className="text-blue-200 mt-1">{trip.ship} · Departs {trip.departureTime} · Arrives {trip.arrivalTime} · {trip.duration}</p>
            </div>
            <span className="text-4xl font-black">€{trip.price}</span>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-6">
          <LightCard>
            <h2 className="font-bold text-[#0a3d62] text-lg mb-4">Passenger details</h2>
            <LightInput id="sl-name" label="Full name" placeholder="e.g. Antti Mäkinen" value={ctx.passengerName} onChange={ctx.setPassengerName} />
            <LightInput id="sl-email" label="Email" type="email" placeholder="antti@example.com" value={ctx.passengerEmail} onChange={ctx.setPassengerEmail} />
          </LightCard>
          <LightCard>
            <h2 className="font-bold text-[#0a3d62] text-lg mb-3">Trip summary</h2>
            <DetailTable rows={[["Route", `${trip.from} → ${trip.to}`],["Date", trip.date],["Departs", trip.departureTime],["Arrives", `${trip.arrivalTime}${trip.arrivalNextDay ? " (+1 day)" : ""}`],["Duration", trip.duration],["Vessel", trip.ship]]} />
          </LightCard>
        </div>
        <div className="flex flex-col gap-6">
          <LightCard>
            <h2 className="font-bold text-[#0a3d62] text-lg mb-1">Select your travel pace</h2>
            <p className="text-sm text-gray-500 mb-4">Sailing a little slower saves fuel and lowers emissions. Use the slider to choose how green this crossing should be.</p>
            <div id="pace-widget" data-external-trip-id={trip.externalTripId} data-public-key={PACECTRL_PUBLIC_KEY} />
            <WidgetStatus ready={ctx.widgetReady} intentId={ctx.latestIntentId} />
          </LightCard>
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">1 adult · taxes included</span>
            <span className="text-2xl font-extrabold text-[#0a3d62]">€{trip.price}</span>
          </div>
          <PayButton color="#0a3d62" price={trip.price} disabled={!canPay} loading={ctx.payState === "loading"} onClick={ctx.handlePay} />
          {!canPay && <p className="text-xs text-gray-400 text-center -mt-4">Fill in passenger details to continue.</p>}
          <ErrorBanner msg={ctx.errorMsg} />
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// LAYOUT B — Turku → Stockholm
// Dark overnight aesthetic. Deep navy, single stacked column.
// Widget is the FIRST thing the user encounters — eco choice as hero.
// ==========================================================================
function LayoutNight({ ctx }: { ctx: LayoutCtx }) {
  const { trip } = ctx;
  const canPay = ctx.passengerName.trim() && ctx.passengerEmail.trim();
  return (
    <div className="min-h-screen bg-[#0b1a2e]">
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
        <Link href="/" className="text-blue-400 text-sm hover:text-blue-200">← All routes</Link>
        <div className="text-center py-4">
          <p className="text-blue-400 text-sm mb-1">{trip.flags} · {trip.date}</p>
          <h1 className="text-4xl font-extrabold text-white">{trip.from} → {trip.to}</h1>
          <p className="text-blue-300 mt-2">{trip.ship} · {trip.departureTime} → {trip.arrivalTime} (+1)</p>
          <p className="text-blue-500 text-sm mt-1">{trip.description}</p>
        </div>
        {/* Widget first — centrepiece of this layout */}
        <div className="bg-[#0f2540] rounded-2xl p-6 border border-blue-900">
          <h2 className="text-white font-bold text-lg mb-1">How fast should we sail?</h2>
          <p className="text-blue-300 text-sm mb-4">The overnight crossing lets you choose a slower, greener pace without losing any sleep.</p>
          <div id="pace-widget" data-external-trip-id={trip.externalTripId} data-public-key={PACECTRL_PUBLIC_KEY} />
          <WidgetStatus ready={ctx.widgetReady} intentId={ctx.latestIntentId} dark />
        </div>
        <div className="bg-[#0f2540] rounded-2xl p-6 border border-blue-900">
          <h2 className="text-white font-bold mb-4">Departure details</h2>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            {([["Departs", `${trip.departureTime}, ${trip.date}`],["Arrives", `${trip.arrivalTime} (next morning)`],["Duration", trip.duration],["Vessel", trip.ship]] as [string,string][]).map(([l,v]) => (
              <div key={l}><p className="text-blue-500 text-xs uppercase tracking-wide">{l}</p><p className="text-white font-medium mt-0.5">{v}</p></div>
            ))}
          </div>
        </div>
        <div className="bg-[#0f2540] rounded-2xl p-6 border border-blue-900">
          <h2 className="text-white font-bold mb-4">Passenger</h2>
          <div className="flex flex-col gap-4">
            <DarkInput id="nl-name" label="Full name" placeholder="e.g. Sofia Lindström" value={ctx.passengerName} onChange={ctx.setPassengerName} />
            <DarkInput id="nl-email" label="Email" type="email" placeholder="sofia@example.com" value={ctx.passengerEmail} onChange={ctx.setPassengerEmail} />
          </div>
        </div>
        <div className="flex items-center justify-between text-white px-1">
          <span className="text-blue-300 text-sm">1 adult · cabin · taxes included</span>
          <span className="text-3xl font-black">€{trip.price}</span>
        </div>
        <PayButton color="#1a4a8a" price={trip.price} disabled={!canPay} loading={ctx.payState === "loading"} onClick={ctx.handlePay} />
        {!canPay && <p className="text-xs text-blue-400 text-center -mt-4">Fill in passenger details above.</p>}
        <ErrorBanner msg={ctx.errorMsg} dark />
      </div>
    </div>
  );
}

// ==========================================================================
// LAYOUT C — Helsinki → Tallinn
// Fresh teal city-shuttle feel. Three-column grid with sticky sidebar.
// Widget is embedded MID-PAGE between the form and checkout summary.
// ==========================================================================
function LayoutCity({ ctx }: { ctx: LayoutCtx }) {
  const { trip } = ctx;
  const canPay = ctx.passengerName.trim() && ctx.passengerEmail.trim();
  return (
    <div className="min-h-screen bg-[#e8f4f3]">
      <div className="bg-[#1a7a6e] text-white px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-teal-200 text-sm hover:text-white mb-2 inline-block">← Routes</Link>
            <h1 className="text-3xl font-extrabold">{trip.from} → {trip.to}</h1>
            <p className="text-teal-200 mt-1">{trip.date} · {trip.departureTime}–{trip.arrivalTime} · {trip.ship}</p>
          </div>
          <div className="text-right"><p className="text-teal-200 text-sm">from</p><p className="text-4xl font-black">€{trip.price}</p></div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1a7a6e] text-lg mb-4">Your details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <LightInput id="ct-name" label="Full name" placeholder="e.g. Emre Kaya" value={ctx.passengerName} onChange={ctx.setPassengerName} accent="teal" />
              <LightInput id="ct-email" label="Email" type="email" placeholder="emre@example.com" value={ctx.passengerEmail} onChange={ctx.setPassengerEmail} accent="teal" />
            </div>
          </div>
          {/* Widget mid-flow */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1a7a6e] text-lg mb-1">Travel pace preference</h2>
            <p className="text-sm text-gray-500 mb-4">A slower crossing and a lighter footprint. Set your preference below before checking out.</p>
            <div id="pace-widget" data-external-trip-id={trip.externalTripId} data-public-key={PACECTRL_PUBLIC_KEY} />
            <WidgetStatus ready={ctx.widgetReady} intentId={ctx.latestIntentId} accent="#1a7a6e" />
          </div>
          <ErrorBanner msg={ctx.errorMsg} />
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1a7a6e] mb-4">Summary</h2>
            <DetailTable rows={[["Route", `${trip.from} → ${trip.to}`],["Date", trip.date],["Dep.", trip.departureTime],["Arr.", trip.arrivalTime],["Ship", trip.ship]]} accentColor="#1a7a6e" />
            <hr className="my-4 border-gray-100" />
            <div className="flex justify-between font-bold text-lg text-[#1a7a6e]"><span>Total</span><span>€{trip.price}</span></div>
          </div>
          <PayButton color="#1a7a6e" price={trip.price} disabled={!canPay} loading={ctx.payState === "loading"} onClick={ctx.handlePay} />
          {!canPay && <p className="text-xs text-gray-400 text-center -mt-2">Fill in your details first.</p>}
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// LAYOUT D — Stockholm → Riga
// Clean dark-mode. Charcoal/slate palette, neutral and premium.
// Widget spans full-width at the very TOP — eco choice as the headline offer.
// ==========================================================================
function LayoutPremium({ ctx }: { ctx: LayoutCtx }) {
  const { trip } = ctx;
  const canPay = ctx.passengerName.trim() && ctx.passengerEmail.trim();
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-6">
        <Link href="/" className="text-slate-400 text-sm hover:text-slate-200">← All departures</Link>

        <div className="text-center">
          <p className="text-slate-400 text-sm mb-1">{trip.flags} · {trip.date}</p>
          <h1 className="text-4xl font-extrabold text-white">{trip.from} → {trip.to}</h1>
          <p className="text-slate-400 mt-2 text-sm">{trip.ship} &nbsp;·&nbsp; {trip.duration} crossing &nbsp;·&nbsp; €{trip.price}</p>
        </div>

        {/* Full-width hero widget at the very top */}
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <div className="bg-[#1c2333] px-6 py-4">
            <h2 className="text-white font-bold text-lg">Your eco preference</h2>
            <p className="text-slate-400 text-sm mt-0.5">Seventeen hours at sea — a small speed reduction makes a big difference to emissions.</p>
          </div>
          <div className="bg-[#161b28] px-6 py-5">
            <div id="pace-widget" data-external-trip-id={trip.externalTripId} data-public-key={PACECTRL_PUBLIC_KEY} />
            <WidgetStatus ready={ctx.widgetReady} intentId={ctx.latestIntentId} dark accentLight="#93c5fd" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#1c2333] rounded-2xl p-5 border border-white/10">
            <h3 className="text-slate-300 font-semibold mb-3">Departure</h3>
            <div className="flex flex-col gap-2 text-sm">
              {([["Date", trip.date],["Departs", trip.departureTime],["Arrives", `${trip.arrivalTime} (next day)`],["Duration", trip.duration],["Vessel", trip.ship]] as [string,string][]).map(([l,v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#1c2333] rounded-2xl p-5 border border-white/10">
            <h3 className="text-slate-300 font-semibold mb-3">Passenger</h3>
            <div className="flex flex-col gap-3">
              <DarkInput id="pr-name" label="Full name" placeholder="e.g. Inese Bērziņa" value={ctx.passengerName} onChange={ctx.setPassengerName} />
              <DarkInput id="pr-email" label="Email" type="email" placeholder="inese@example.com" value={ctx.passengerEmail} onChange={ctx.setPassengerEmail} />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-1">
          <span className="text-slate-400 text-sm">1 adult · cabin · all fees included</span>
          <span className="text-3xl font-black text-white">€{trip.price}</span>
        </div>
        <PayButton color="#1e3a5f" price={trip.price} disabled={!canPay} loading={ctx.payState === "loading"} onClick={ctx.handlePay} />
        {!canPay && <p className="text-xs text-slate-500 text-center -mt-4">Enter passenger details above.</p>}
        <ErrorBanner msg={ctx.errorMsg} dark />
      </div>
    </div>
  );
}

// ==========================================================================
// Shared micro-components used across all layouts
// ==========================================================================

function LightCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">{children}</div>;
}

function LightInput({
  id, label, placeholder, value, onChange, type = "text", accent = "blue",
}: {
  id: string; label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; accent?: string;
}) {
  const ring = accent === "teal" ? "focus:ring-teal-300" : "focus:ring-blue-200";
  return (
    <div className="flex flex-col gap-1 mb-3 last:mb-0">
      <label htmlFor={id} className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</label>
      <input id={id} type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`} />
    </div>
  );
}

function DarkInput({
  id, label, placeholder, value, onChange, type = "text", variant = "blue",
}: {
  id: string; label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; variant?: "blue" | "red";
}) {
  const ring = variant === "red" ? "focus:ring-red-700" : "focus:ring-blue-700";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</label>
      <input id={id} type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`} />
    </div>
  );
}

function DetailTable({
  rows, accentColor = "#0a3d62",
}: {
  rows: [string, string][]; accentColor?: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between items-baseline gap-4">
          <span className="text-gray-400 shrink-0">{label}</span>
          <span className="font-medium text-right" style={{ color: accentColor }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function WidgetStatus({
  ready, intentId, dark = false, accent, accentLight,
}: {
  ready: boolean; intentId: string | null;
  dark?: boolean; accent?: string; accentLight?: string;
}) {
  if (!ready) {
    return <p className={`text-xs text-center mt-3 animate-pulse ${dark ? "text-gray-500" : "text-gray-400"}`}>Loading eco-speed slider…</p>;
  }
  return null;
}

function PayButton({
  color, price, disabled, loading, onClick,
}: {
  color: string; price: number; disabled: boolean; loading: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ backgroundColor: color }}
      className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]">
      {loading ? (
        <span className="flex items-center justify-center gap-3">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          Processing payment…
        </span>
      ) : `Pay €${price} — Confirm Booking`}
    </button>
  );
}

function ErrorBanner({ msg, dark = false }: { msg: string | null; dark?: boolean }) {
  if (!msg) return null;
  return (
    <div className={`rounded-xl text-sm px-4 py-3 ${dark ? "bg-red-950 border border-red-800 text-red-300" : "bg-red-50 border border-red-200 text-red-700"}`}>
      <strong>Payment failed:</strong> {msg}
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────
function SuccessScreen({
  trip, bookingRef, passengerName, intentCaptured,
}: {
  trip: Trip; bookingRef: string; passengerName: string; intentCaptured: boolean;
}) {
  return (
    <div className="max-w-lg mx-auto px-6 py-16 text-center flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full bg-[#e8f4f3] flex items-center justify-center text-5xl">✅</div>
      <h1 className="text-3xl font-extrabold text-[#0a3d62]">Booking Confirmed!</h1>
      {passengerName && (
        <p className="text-gray-600">Thank you, <strong>{passengerName}</strong>. Your ticket is on its way.</p>
      )}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 text-left flex flex-col gap-3 text-sm">
        {([["Booking ref", bookingRef],["Route", `${trip.from} → ${trip.to}`],["Date", trip.date],["Departs", trip.departureTime],["Vessel", trip.ship],["Amount paid", `€${trip.price}`]] as [string,string][]).map(([l,v]) => (
          <div key={l} className="flex justify-between items-baseline gap-4">
            <span className="text-gray-400">{l}</span>
            <span className="font-mono text-xs font-medium text-[#0a3d62] text-right">{v}</span>
          </div>
        ))}
      </div>
      {intentCaptured ? (
        <div className="bg-[#e8f4f3] border border-[#1a7a6e]/30 rounded-xl px-5 py-4 text-sm text-[#1a7a6e]">
          Your eco-speed preference has been recorded and shared with the ship&apos;s navigator.
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-500">
          No speed preference was set — the ship will sail its standard schedule.
        </div>
      )}
      <Link href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: trip.color }}>
        ← Back to routes
      </Link>
    </div>
  );
}

function TripNotFound() {
  return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <p className="text-5xl mb-6">🚢</p>
      <h1 className="text-2xl font-bold text-[#0a3d62] mb-3">Trip not found</h1>
      <p className="text-gray-500 mb-8">We couldn&apos;t find that departure.</p>
      <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-[#0a3d62] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">
        ← View all routes
      </Link>
    </div>
  );
}
