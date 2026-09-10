"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, generateUniqueSlug } from "@/lib/slug";
import type { EntityType } from "@/lib/onboarding-types";

export interface CreateOrganizationInput {
  name: string;
  type: EntityType;
  logoUrl?: string | null;
}

export type CreateOrganizationResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; field?: "name" | "type" | "slug" };

/**
 * Create a new organization for the authenticated user.
 *
 * This action is intentionally separate from completeOnboarding — it does NOT
 * touch OnboardingProgress. It is the backend for the /new-org page.
 */
export async function createOrganization(
  input: CreateOrganizationInput
): Promise<CreateOrganizationResult> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, error: "Not authenticated" };
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const name = input.name?.trim() ?? "";
  if (!name) {
    return { ok: false, error: "Name is required.", field: "name" };
  }
  if (name.length < 2) {
    return {
      ok: false,
      error: "Name must be at least 2 characters.",
      field: "name",
    };
  }
  if (name.length > 100) {
    return {
      ok: false,
      error: "Name must be 100 characters or fewer.",
      field: "name",
    };
  }

  const validTypes: EntityType[] = ["SCHOOL", "ORGANIZATION", "EVENT"];
  if (!validTypes.includes(input.type)) {
    return { ok: false, error: "Invalid organization type.", field: "type" };
  }

  const baseSlug = slugify(name);
  if (!baseSlug) {
    return {
      ok: false,
      error:
        "Name cannot generate a valid URL. Please use alphanumeric characters.",
      field: "name",
    };
  }

  // ── Create ────────────────────────────────────────────────────────────────
  try {
    const slug = await generateUniqueSlug(name);

    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          type: input.type,
          logoUrl: input.logoUrl ?? null,
        },
      });

      await tx.membership.create({
        data: {
          userId: session.user.id,
          organizationId: org.id,
          role: "OWNER",
        },
      });
    });

    return { ok: true, slug };
  } catch (err) {
    console.error("[createOrganization]", err);
    return {
      ok: false,
      error: "Failed to create organization. Please try again.",
    };
  }
}
