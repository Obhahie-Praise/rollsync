import { prisma } from "@/lib/prisma";

/**
 * Convert a name into a URL-safe slug.
 * e.g. "Acme School!" → "acme-school"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // strip non-alphanumeric (except spaces/hyphens)
    .replace(/\s+/g, "-")          // spaces → hyphens
    .replace(/-+/g, "-")           // collapse repeated hyphens
    .replace(/^-|-$/g, "");        // trim leading/trailing hyphens
}

/**
 * Generate a slug that is guaranteed to be unique in the database.
 * If "acme-school" is taken, tries "acme-school-2", "acme-school-3", etc.
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);

  if (!base) {
    throw new Error("Cannot generate a slug from an empty name.");
  }

  // Check if the base slug is available
  const existing = await prisma.organization.findUnique({
    where: { slug: base },
    select: { id: true },
  });

  if (!existing) {
    return base;
  }

  // Find the highest existing numeric suffix
  const similar = await prisma.organization.findMany({
    where: { slug: { startsWith: base + "-" } },
    select: { slug: true },
  });

  const suffixes = similar
    .map((o) => {
      const match = o.slug.match(new RegExp(`^${base}-(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const next = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 2;
  return `${base}-${next}`;
}
