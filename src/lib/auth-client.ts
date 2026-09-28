import { createAuthClient } from "better-auth/client";

// No baseURL is passed here intentionally.
//
// Better Auth's client defaults to same-origin requests, which means:
//   - In production (https://rollsync.vercel.app) it posts to
//     https://rollsync.vercel.app/api/auth/...
//   - In local dev (http://localhost:3000) it posts to
//     http://localhost:3000/api/auth/...
//
// Hardcoding a baseURL (or reading one from NEXT_PUBLIC_APP_URL) is what
// caused the previous bug: the client was built with "http://localhost:3000"
// baked in and that value was served to production browsers.
export const authClient = createAuthClient();
