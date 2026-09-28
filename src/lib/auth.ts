import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma"; // your prisma client instance

// Resolve the base URL for this environment.
//
// BETTER_AUTH_URL must be set in production Vercel env vars:
//   BETTER_AUTH_URL=https://rollsync.vercel.app
//
// In local development it falls back to http://localhost:3000.
// The fallback is intentionally never used in production — if BETTER_AUTH_URL
// is missing in a production build, the empty string will cause auth to fail
// loudly rather than silently serve localhost URLs to production browsers.
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");

// Always trust the configured base URL origin.
// In local dev also trust localhost explicitly so that dev still works even
// when BETTER_AUTH_URL is not set locally.
const trustedOrigins = Array.from(
  new Set([
    baseURL,
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:3000"]
      : []),
  ].filter(Boolean))
);

export const auth = betterAuth({
  baseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }
  },
  trustedOrigins,
});
