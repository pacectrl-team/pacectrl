/**
 * NordLine ferry trip catalogue.
 *
 * Each trip has:
 *  - A stable externalTripId that matches the value registered in NordLine
 *    (format: {FROM}-{TO}-{YYYY-MM-DD})
 *  - Realistic ferry route details (departure, arrival, ship, price)
 *
 * The publicKey "ffDHklbQMH1PnryFLzGoyCi-5MPS37ILdFYNgltpmYY" is the operator public key registered in the NordLine
 * demo environment. Update it here if it ever changes.
 */

export const PACECTRL_PUBLIC_KEY = "ffDHklbQMH1PnryFLzGoyCi-5MPS37ILdFYNgltpmYY";

export type Trip = {
  /** URL-safe slug used as the Next.js route param */
  id: string;
  /** PaceCtrl external trip ID — must match what's in the PaceCtrl DB */
  externalTripId: string;
  from: string;
  to: string;
  /** IATA-style port codes for display */
  fromCode: string;
  toCode: string;
  departureTime: string;   // "HH:MM"
  arrivalTime: string;     // "HH:MM"
  arrivalNextDay: boolean; // true if the arrival is the following calendar day
  date: string;            // Human-readable departure date e.g. "15 Mar 2026"
  isoDate: string;         // ISO date of departure for formatting e.g. "2026-03-15"
  duration: string;        // Human-readable e.g. "4h 00min"
  ship: string;
  /** Price in EUR for a standard adult cabin/seat */
  price: number;
  description: string;
  /** Emoji flags for quick visual scanning */
  flags: string;
  /** Colour accent applied to the trip card header */
  color: string;
};

export const TRIPS: Trip[] = [
  {
    id: "vsa-ume",
    externalTripId: "VSA-UME-2026-03-15",
    from: "Vaasa",
    to: "Umeå",
    fromCode: "VSA",
    toCode: "UME",
    departureTime: "08:00",
    arrivalTime: "12:00",
    arrivalNextDay: false,
    date: "15 Mar 2026",
    isoDate: "2026-03-15",
    duration: "4h 00min",
    ship: "M/S Aurora Botnica",
    price: 49,
    description:
      "A scenic daytime crossing of the Bothnian Bay between Finland and Sweden. Enjoy the quiet northern seascape on this compact RoPax ferry.",
    flags: "🇫🇮 → 🇸🇪",
    color: "#0a3d62",
  },
  {
    id: "tku-sto",
    externalTripId: "TKU-STO-2026-03-15",
    from: "Turku",
    to: "Stockholm",
    fromCode: "TKU",
    toCode: "STO",
    departureTime: "20:30",
    arrivalTime: "07:15",
    arrivalNextDay: true,
    date: "15 Mar 2026",
    isoDate: "2026-03-15",
    duration: "10h 45min",
    ship: "M/S Nordic Princess",
    price: 89,
    description:
      "The classic overnight archipelago cruise. Depart at dusk, wind through thousands of islands, and wake up in Stockholm.",
    flags: "🇫🇮 → 🇸🇪",
    color: "#1a4a8a",
  },
  {
    id: "hel-tll",
    externalTripId: "HEL-TLL-2026-03-15",
    from: "Helsinki",
    to: "Tallinn",
    fromCode: "HEL",
    toCode: "TLL",
    departureTime: "09:30",
    arrivalTime: "12:00",
    arrivalNextDay: false,
    date: "15 Mar 2026",
    isoDate: "2026-03-15",
    duration: "2h 30min",
    ship: "M/S Baltic Star",
    price: 39,
    description:
      "The popular Gulf of Finland shuttle. Cross between two charming capitals in just 2.5 hours on a modern high-speed vessel.",
    flags: "🇫🇮 → 🇪🇪",
    color: "#1a7a6e",
  },
  {
    id: "sto-rix",
    externalTripId: "STO-RIX-2026-03-15",
    from: "Stockholm",
    to: "Riga",
    fromCode: "STO",
    toCode: "RIX",
    departureTime: "17:00",
    arrivalTime: "10:00",
    arrivalNextDay: true,
    date: "15 Mar 2026",
    isoDate: "2026-03-15",
    duration: "17h 00min",
    ship: "M/S Baltic Voyager",
    price: 119,
    description:
      "A full overnight Baltic crossing with dinner, live entertainment, and a comfortable cabin. Arrive in Riga refreshed for your adventure.",
    flags: "🇸🇪 → 🇱🇻",
    color: "#1e3a5f",
  },
];

/** Look up a trip by its URL slug. Returns undefined if not found. */
export function getTripById(id: string): Trip | undefined {
  return TRIPS.find((t) => t.id === id);
}
