import Link from "next/link";
import { TRIPS, type Trip } from "@/lib/trips";

// ---------------------------------------------------------------------------
// Home page — lists all available ferry departures
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-nordline-blue mb-3">
          Available Departures
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Choose your crossing — all routes include the option to slow down for
          a greener, more relaxed voyage.
        </p>
      </section>

      {/* Trip cards grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {TRIPS.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>


    </div>
  );
}

// ---------------------------------------------------------------------------
// Trip card component
// ---------------------------------------------------------------------------
function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link
      href={`/booking/${trip.id}`}
      className="group flex flex-col rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow border border-gray-100 bg-white"
    >
      {/* Coloured accent bar */}
      <div
        className="h-2"
        style={{ backgroundColor: trip.color }}
      />

      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Route header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              {trip.flags}
            </p>
            <h2 className="text-xl font-bold text-nordline-blue group-hover:text-nordline-teal transition-colors">
              {trip.from} → {trip.to}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{trip.ship}</p>
          </div>
          <span className="text-2xl font-extrabold text-nordline-blue">
            €{trip.price}
          </span>
        </div>

        {/* Schedule pill row */}
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <SchedulePill label="Departs" value={`${trip.departureTime} — ${trip.date}`} />
          <SchedulePill
            label="Arrives"
            value={`${trip.arrivalTime}${trip.arrivalNextDay ? " (+1)" : ""}`}
          />
          <SchedulePill label="Duration" value={trip.duration} />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed flex-1">
          {trip.description}
        </p>

        {/* CTA */}
        <span
          className="mt-2 self-start inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity group-hover:opacity-90"
          style={{ backgroundColor: trip.color }}
        >
          Book now →
        </span>
      </div>
    </Link>
  );
}

function SchedulePill({ label, value }: { label: string; value: string }) {
  return (
    <span className="bg-nordline-light text-nordline-teal rounded-full px-3 py-1">
      <span className="text-gray-400 font-normal">{label}: </span>
      {value}
    </span>
  );
}
