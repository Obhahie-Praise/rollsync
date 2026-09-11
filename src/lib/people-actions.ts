"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PersonType, PersonStatus } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { PersonType, PersonStatus };

export interface PersonListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  orgIdentifier: string | null;
  personType: PersonType;
  status: PersonStatus;
  linkedUserId: string | null;
  linkedUserName: string | null;
  linkedUserEmail: string | null;
  linkedUserRole: string | null; // Membership role if linked user is a member
  createdAt: Date;
}

export interface PersonDetail extends PersonListItem {
  updatedAt: Date;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

/**
 * Verify the user is a member of the org with the given slug.
 * Returns org + membership role.
 */
async function requireOrgMember(userId: string, slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, publicId: true },
  });
  if (!org) throw new Error("Organization not found");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership) throw new Error("Not a member of this organization");

  return { org, role: membership.role };
}

// ─── List people ──────────────────────────────────────────────────────────────

export interface ListPeopleInput {
  slug: string;
  search?: string;
  personType?: PersonType | "";
  status?: PersonStatus | "";
  hasAccess?: "yes" | "no" | "";
}

export type ListPeopleResult =
  | { ok: true; people: PersonListItem[]; total: number }
  | { ok: false; error: string };

export async function listPeople(
  input: ListPeopleInput
): Promise<ListPeopleResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, input.slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  try {
    const where: {
      organizationId: string;
      status?: PersonStatus;
      personType?: PersonType;
      linkedUserId?: string | null | { not: null };
      OR?: Array<{ name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" }; orgIdentifier?: { contains: string; mode: "insensitive" }; phone?: { contains: string; mode: "insensitive" } }>;
    } = {
      organizationId: orgData.org.id,
    };

    if (input.status) {
      where.status = input.status as PersonStatus;
    }

    if (input.personType) {
      where.personType = input.personType as PersonType;
    }

    if (input.hasAccess === "yes") {
      where.linkedUserId = { not: null };
    } else if (input.hasAccess === "no") {
      where.linkedUserId = null;
    }

    if (input.search) {
      const q = input.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { orgIdentifier: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const people = await prisma.person.findMany({
      where,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        orgIdentifier: true,
        personType: true,
        status: true,
        linkedUserId: true,
        createdAt: true,
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            memberships: {
              where: { organizationId: orgData.org.id },
              select: { role: true },
              take: 1,
            },
          },
        },
      },
    });

    const items: PersonListItem[] = people.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      orgIdentifier: p.orgIdentifier,
      personType: p.personType,
      status: p.status,
      linkedUserId: p.linkedUserId,
      linkedUserName: p.linkedUser?.name ?? null,
      linkedUserEmail: p.linkedUser?.email ?? null,
      linkedUserRole: p.linkedUser?.memberships[0]?.role ?? null,
      createdAt: p.createdAt,
    }));

    return { ok: true, people: items, total: items.length };
  } catch (err) {
    console.error("[listPeople]", err);
    return { ok: false, error: "Failed to load people." };
  }
}

// ─── Get person detail ────────────────────────────────────────────────────────

export type GetPersonResult =
  | { ok: true; person: PersonDetail }
  | { ok: false; error: string };

export async function getPerson(
  slug: string,
  personId: string
): Promise<GetPersonResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  try {
    const person = await prisma.person.findFirst({
      where: { id: personId, organizationId: orgData.org.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        orgIdentifier: true,
        personType: true,
        status: true,
        linkedUserId: true,
        createdAt: true,
        updatedAt: true,
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            memberships: {
              where: { organizationId: orgData.org.id },
              select: { role: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!person) return { ok: false, error: "Person not found" };

    return {
      ok: true,
      person: {
        id: person.id,
        name: person.name,
        email: person.email,
        phone: person.phone,
        orgIdentifier: person.orgIdentifier,
        personType: person.personType,
        status: person.status,
        linkedUserId: person.linkedUserId,
        linkedUserName: person.linkedUser?.name ?? null,
        linkedUserEmail: person.linkedUser?.email ?? null,
        linkedUserRole: person.linkedUser?.memberships[0]?.role ?? null,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt,
      },
    };
  } catch (err) {
    console.error("[getPerson]", err);
    return { ok: false, error: "Failed to load person." };
  }
}

// ─── Create person ────────────────────────────────────────────────────────────

export interface CreatePersonInput {
  slug: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  orgIdentifier?: string | null;
  personType: PersonType;
}

export type CreatePersonResult =
  | { ok: true; person: PersonListItem }
  | { ok: false; error: string; field?: "name" | "email" | "orgIdentifier" };

export async function createPerson(
  input: CreatePersonInput
): Promise<CreatePersonResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, input.slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  // Only OWNER or ADMIN can add people
  if (orgData.role === "MEMBER") {
    return {
      ok: false,
      error: "You need Admin or Owner access to add people.",
    };
  }

  // Validate
  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Name is required.", field: "name" };
  if (name.length < 2)
    return { ok: false, error: "Name must be at least 2 characters.", field: "name" };
  if (name.length > 150)
    return { ok: false, error: "Name must be 150 characters or fewer.", field: "name" };

  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Invalid email address.", field: "email" };
  }

  const orgIdentifier = input.orgIdentifier?.trim() || null;
  if (orgIdentifier && orgIdentifier.length > 100) {
    return {
      ok: false,
      error: "ID must be 100 characters or fewer.",
      field: "orgIdentifier",
    };
  }

  const validTypes: PersonType[] = [
    "STUDENT", "TEACHER", "STAFF", "ADMINISTRATOR", "DIRECTOR",
  ];
  if (!validTypes.includes(input.personType)) {
    return { ok: false, error: "Invalid person type." };
  }

  try {
    const created = await prisma.person.create({
      data: {
        organizationId: orgData.org.id,
        name,
        email,
        phone: input.phone?.trim() || null,
        orgIdentifier,
        personType: input.personType,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        orgIdentifier: true,
        personType: true,
        status: true,
        linkedUserId: true,
        createdAt: true,
      },
    });

    return {
      ok: true,
      person: {
        id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone,
        orgIdentifier: created.orgIdentifier,
        personType: created.personType,
        status: created.status,
        linkedUserId: null,
        linkedUserName: null,
        linkedUserEmail: null,
        linkedUserRole: null,
        createdAt: created.createdAt,
      },
    };
  } catch (err: unknown) {
    console.error("[createPerson]", err);
    // Unique constraint on orgIdentifier within org
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("orgIdentifier")
    ) {
      return {
        ok: false,
        error: "This organization ID is already in use.",
        field: "orgIdentifier",
      };
    }
    return { ok: false, error: "Failed to create person. Please try again." };
  }
}

// ─── Update person ────────────────────────────────────────────────────────────

export interface UpdatePersonInput {
  slug: string;
  personId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  orgIdentifier?: string | null;
  personType: PersonType;
}

export type UpdatePersonResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" | "email" | "orgIdentifier" };

export async function updatePerson(
  input: UpdatePersonInput
): Promise<UpdatePersonResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, input.slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  if (orgData.role === "MEMBER") {
    return {
      ok: false,
      error: "You need Admin or Owner access to edit people.",
    };
  }

  // Validate
  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Name is required.", field: "name" };
  if (name.length < 2)
    return { ok: false, error: "Name must be at least 2 characters.", field: "name" };
  if (name.length > 150)
    return { ok: false, error: "Name must be 150 characters or fewer.", field: "name" };

  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Invalid email address.", field: "email" };
  }

  const orgIdentifier = input.orgIdentifier?.trim() || null;
  if (orgIdentifier && orgIdentifier.length > 100) {
    return {
      ok: false,
      error: "ID must be 100 characters or fewer.",
      field: "orgIdentifier",
    };
  }

  const validTypes: PersonType[] = [
    "STUDENT", "TEACHER", "STAFF", "ADMINISTRATOR", "DIRECTOR",
  ];
  if (!validTypes.includes(input.personType)) {
    return { ok: false, error: "Invalid person type." };
  }

  try {
    // Verify person belongs to this org
    const existing = await prisma.person.findFirst({
      where: { id: input.personId, organizationId: orgData.org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Person not found." };

    await prisma.person.update({
      where: { id: input.personId },
      data: {
        name,
        email,
        phone: input.phone?.trim() || null,
        orgIdentifier,
        personType: input.personType,
      },
    });

    return { ok: true };
  } catch (err: unknown) {
    console.error("[updatePerson]", err);
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("orgIdentifier")
    ) {
      return {
        ok: false,
        error: "This organization ID is already in use.",
        field: "orgIdentifier",
      };
    }
    return { ok: false, error: "Failed to update person. Please try again." };
  }
}

// ─── Set person status (activate / deactivate) ────────────────────────────────

export type SetPersonStatusResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setPersonStatus(
  slug: string,
  personId: string,
  status: PersonStatus
): Promise<SetPersonStatusResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  if (orgData.role === "MEMBER") {
    return {
      ok: false,
      error: "You need Admin or Owner access to change a person's status.",
    };
  }

  try {
    const existing = await prisma.person.findFirst({
      where: { id: personId, organizationId: orgData.org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Person not found." };

    await prisma.person.update({
      where: { id: personId },
      data: { status },
    });

    return { ok: true };
  } catch (err) {
    console.error("[setPersonStatus]", err);
    return { ok: false, error: "Failed to update status. Please try again." };
  }
}


// ─── Add Member (account provisioning) ───────────────────────────────────────
//
// Creates a full Roll SYNC account (User + Account record) via Better Auth,
// then atomically creates/reuses the Person and Membership.
//
// Flow:
//   1. Validate admin permissions
//   2. Check if the email already belongs to an existing User
//   3. If not → create User via auth.api.signUpEmail (handles password hashing)
//   4. Check if a Person already exists for this org with the same email or linkedUserId
//   5. Create/reuse Person, set linkedUserId
//   6. Create/reuse Membership (MEMBER role, no downgrade)
//
// Initial password = orgId (the member must change it — the UI tells them).
// Never exposed in logs or responses.

export interface AddMemberInput {
  slug: string;
  name: string;
  email: string;
  personType: PersonType;
  /** Optional — if provided, links to this existing Person instead of creating a new one */
  existingPersonId?: string | null;
}

export type AddMemberResult =
  | { ok: true; personId: string; isNewUser: boolean; isNewPerson: boolean; initialPassword: string }
  | { ok: false; error: string; field?: "name" | "email" | "personType" };

export async function addMember(input: AddMemberInput): Promise<AddMemberResult> {
  // ── 1. Authenticate + authorise ──────────────────────────────────────────
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, input.slug);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  if (orgData.role === "MEMBER") {
    return { ok: false, error: "You need Admin or Owner access to add members." };
  }

  // ── 2. Validate input ────────────────────────────────────────────────────
  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Name is required.", field: "name" };
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters.", field: "name" };
  if (name.length > 150) return { ok: false, error: "Name must be 150 characters or fewer.", field: "name" };

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!email) return { ok: false, error: "Email is required.", field: "email" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Invalid email address.", field: "email" };
  }

  const validTypes: PersonType[] = ["STUDENT", "TEACHER", "STAFF", "ADMINISTRATOR", "DIRECTOR"];
  if (!validTypes.includes(input.personType)) {
    return { ok: false, error: "Invalid person type.", field: "personType" };
  }

  // ── 3. Resolve or create the Roll SYNC User ──────────────────────────────
  let userId: string;
  let isNewUser = false;

  // Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    // Reuse the existing user — do not create a duplicate
    userId = existingUser.id;
  } else {
    // Create the user via Better Auth (handles hashing, account record, etc.)
    // The initial password is the org's publicId (human-readable, e.g. "ACME-123").
    // Falls back to a safe prefix + last 8 chars of the CUID if publicId is not set yet.
    // The member should change it after first login.
    try {
      const initialPassword = orgData.org.publicId ?? `rollsync-${orgData.org.id.slice(-8)}`;
      const signUpResult = await auth.api.signUpEmail({
        body: {
          name,
          email,
          password: initialPassword,
        },
        // Pass empty headers — this is a server-initiated creation
        headers: new Headers(),
      });

      if (!signUpResult?.user?.id) {
        return { ok: false, error: "Failed to create account. Please try again." };
      }
      userId = signUpResult.user.id;
      isNewUser = true;
    } catch (err) {
      console.error("[addMember] signUpEmail failed:", err);
      // Last-chance check: maybe the user was created by a concurrent request
      const raceUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (raceUser) {
        userId = raceUser.id;
      } else {
        return { ok: false, error: "Failed to create account. Please try again." };
      }
    }
  }

  // ── 4. Resolve or create the Person, link, and create Membership ─────────
  try {
    let personId: string;
    let isNewPerson = false;

    const result = await prisma.$transaction(async (tx) => {
      // Validate existingPersonId if provided
      if (input.existingPersonId) {
        const existing = await tx.person.findFirst({
          where: { id: input.existingPersonId, organizationId: orgData.org.id },
          select: { id: true, linkedUserId: true },
        });
        if (!existing) throw new Error("Person not found in this organization.");
        if (existing.linkedUserId && existing.linkedUserId !== userId) {
          throw new Error("This person is already linked to a different account.");
        }
        // Link Person → User
        await tx.person.update({
          where: { id: existing.id },
          data: { linkedUserId: userId },
        });
        personId = existing.id;
      } else {
        // Check if any Person in this org is already linked to this user
        const alreadyLinked = await tx.person.findFirst({
          where: { organizationId: orgData.org.id, linkedUserId: userId },
          select: { id: true },
        });

        if (alreadyLinked) {
          personId = alreadyLinked.id;
        } else {
          // Check for an unlinked Person with this email in the org
          const byEmail = await tx.person.findFirst({
            where: { organizationId: orgData.org.id, email, linkedUserId: null },
            select: { id: true },
          });

          if (byEmail) {
            // Link the existing Person
            await tx.person.update({
              where: { id: byEmail.id },
              data: { linkedUserId: userId, name, personType: input.personType },
            });
            personId = byEmail.id;
          } else {
            // Create a new Person
            const created = await tx.person.create({
              data: {
                organizationId: orgData.org.id,
                name,
                email,
                personType: input.personType,
                status: "ACTIVE",
                linkedUserId: userId,
              },
              select: { id: true },
            });
            personId = created.id;
            isNewPerson = true;
          }
        }
      }

      // Create/reuse Membership — never downgrade an existing higher role
      await tx.membership.upsert({
        where: { userId_organizationId: { userId, organizationId: orgData.org.id } },
        create: { userId, organizationId: orgData.org.id, role: "MEMBER" },
        update: {}, // preserve existing role
      });

      return { personId, isNewPerson };
    });

    return { ok: true, personId: result.personId, isNewUser, isNewPerson: result.isNewPerson, initialPassword: orgData.org.publicId ?? `rollsync-${orgData.org.id.slice(-8)}` };
  } catch (err) {
    console.error("[addMember] transaction failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to complete member setup.";
    return { ok: false, error: msg };
  }
}

// ─── Link existing person to existing member account ─────────────────────────
// Admin can link an unlinked Person to an existing User account directly.

export interface LinkPersonToUserInput {
  slug: string;
  personId: string;
  email: string; // email of the existing user to link
}

export type LinkPersonToUserResult =
  | { ok: true }
  | { ok: false; error: string };

export async function linkPersonToUser(
  input: LinkPersonToUserInput
): Promise<LinkPersonToUserResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, input.slug);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  if (orgData.role === "MEMBER") {
    return { ok: false, error: "Admin or Owner access required." };
  }

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!email) return { ok: false, error: "Email is required." };

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return { ok: false, error: "No Roll SYNC account found with that email." };

    const person = await prisma.person.findFirst({
      where: { id: input.personId, organizationId: orgData.org.id },
      select: { id: true, linkedUserId: true },
    });
    if (!person) return { ok: false, error: "Person not found." };
    if (person.linkedUserId && person.linkedUserId !== user.id) {
      return { ok: false, error: "This person is already linked to a different account." };
    }

    // Check this user isn't already linked to a different person in this org
    const conflict = await prisma.person.findFirst({
      where: { organizationId: orgData.org.id, linkedUserId: user.id, id: { not: input.personId } },
      select: { name: true },
    });
    if (conflict) {
      return { ok: false, error: `This account is already linked to "${conflict.name}" in this organization.` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.person.update({ where: { id: input.personId }, data: { linkedUserId: user.id } });
      await tx.membership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: orgData.org.id } },
        create: { userId: user.id, organizationId: orgData.org.id, role: "MEMBER" },
        update: {},
      });
    });

    return { ok: true };
  } catch (err) {
    console.error("[linkPersonToUser]", err);
    return { ok: false, error: "Failed to link account. Please try again." };
  }
}
