import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose the backend URL to the browser via a public env variable.
  // Set NEXT_PUBLIC_BOOKING_BACKEND_URL in Railway (or .env.local for dev).
  env: {
    NEXT_PUBLIC_BOOKING_BACKEND_URL:
      process.env.NEXT_PUBLIC_BOOKING_BACKEND_URL ?? "http://localhost:8000",
  },
};

export default nextConfig;
