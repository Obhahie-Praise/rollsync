import { NextResponse } from "next/server";
import { resolveAbsences } from "@/lib/attendance-actions";

// This route can be called periodically by Vercel Cron
// Set up via vercel.json: { "crons": [{ "path": "/api/cron/resolve-absences", "schedule": "0 * * * *" }] }

export async function GET(request: Request) {
  // Optional: Add a secret key check to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await resolveAbsences();

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Absences resolved successfully",
    resolvedCount: result.resolvedCount,
  });
}
