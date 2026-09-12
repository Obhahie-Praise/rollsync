"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  ClassStatus,
  TimetableStatus,
  ExceptionType,
} from "@/generated/prisma/client";

// ─── Re-exports for consumers ─────────────────────────────────────────────────

export type { ClassStatus, TimetableStatus, ExceptionType };

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ClassItem {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  /** Stable public QR identity — e.g. "RS-7K4M9Q2X" */
  publicCode: string | null;
  description: string | null;
  status: ClassStatus;
  memberCount: number;
  createdAt: Date;
}

// ─── Public code generation ───────────────────────────────────────────────────

const PUBLIC_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a stable, collision-resistant public class code.
 * Format: RS-XXXXXXXX  (8 uppercase alphanumeric chars, no O/0/I/1 ambiguity)
 * This is server-side only — never supplied by the client.
 */
function generateClassPublicCode(): string {
  const chars = new Array<string>(8);
  // Use Math.random — no crypto dependency needed for a short opaque token
  for (let i = 0; i < 8; i++) {
    chars[i] = PUBLIC_CODE_CHARS[Math.floor(Math.random() * PUBLIC_CODE_CHARS.length)];
  }
  return "RS-" + chars.join("");
}

/**
 * Generate a unique public code, retrying up to 10 times if there is a collision.
 */
async function generateUniquePublicCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateClassPublicCode();
    const existing = await prisma.class.findUnique({
      where: { publicCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  // Extremely unlikely — 32^8 = ~1 trillion combinations
  throw new Error("Could not generate a unique class code. Please try again.");
}

export interface SubjectItem {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: Date;
}

export interface RoomItem {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  createdAt: Date;
}

export interface TimetableEntryItem {
  id: string;
  organizationId: string;
  teacherPersonId: string;
  teacherName: string;
  classId: string;
  className: string;
  classCode: string | null;
  subjectId: string;
  subjectName: string;
  roomId: string | null;
  roomName: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  periodLabel: string | null;
  status: TimetableStatus;
  createdAt: Date;
}

export interface TimetableExceptionItem {
  id: string;
  organizationId: string;
  timetableEntryId: string;
  exceptionDate: Date;
  exceptionType: ExceptionType;
  newDate: Date | null;
  newStartTime: string | null;
  newEndTime: string | null;
  substitutePersonId: string | null;
  substitutePersonName: string | null;
  newRoomId: string | null;
  newRoomName: string | null;
  note: string | null;
  createdAt: Date;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

async function requireOrgMember(userId: string, slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!org) throw new Error("Organization not found");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership) throw new Error("Not a member of this organization");

  return { org, role: membership.role };
}

async function requireAdmin(userId: string, slug: string) {
  const { org, role } = await requireOrgMember(userId, slug);
  if (role === "MEMBER") {
    throw new Error("You need Admin or Owner access to perform this action.");
  }
  return { org, role };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASS ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type ListClassesResult =
  | { ok: true; classes: ClassItem[] }
  | { ok: false; error: string };

export async function listClasses(slug: string): Promise<ListClassesResult> {
  try {
    const session = await requireSession();
    const { org } = await requireOrgMember(session.user.id, slug);

    const classes = await prisma.class.findMany({
      where: { organizationId: org.id },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        publicCode: true,
        description: true,
        status: true,
        createdAt: true,
        _count: { select: { memberships: { where: { endDate: null } } } },
      },
    });

    return {
      ok: true,
      classes: classes.map((c) => ({
        id: c.id,
        organizationId: c.organizationId,
        name: c.name,
        code: c.code,
        publicCode: c.publicCode,
        description: c.description,
        status: c.status,
        memberCount: c._count.memberships,
        createdAt: c.createdAt,
      })),
    };
  } catch (err) {
    console.error("[listClasses]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load classes.",
    };
  }
}

export interface CreateClassInput {
  slug: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

export type CreateClassResult =
  | { ok: true; class: ClassItem }
  | { ok: false; error: string; field?: "name" | "code" };

export async function createClass(
  input: CreateClassInput
): Promise<CreateClassResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    const name = input.name?.trim() ?? "";
    if (!name) return { ok: false, error: "Class name is required.", field: "name" };
    if (name.length > 100)
      return { ok: false, error: "Name must be 100 characters or fewer.", field: "name" };

    const code = input.code?.trim() || null;
    if (code && code.length > 20)
      return { ok: false, error: "Code must be 20 characters or fewer.", field: "code" };

    const created = await prisma.class.create({
      data: {
        organizationId: org.id,
        name,
        code,
        description: input.description?.trim() || null,
        status: "ACTIVE",
        publicCode: await generateUniquePublicCode(),
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        publicCode: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ok: true,
      class: { ...created, memberCount: 0 },
    };
  } catch (err: unknown) {
    console.error("[createClass]", err);
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("name")
    ) {
      return { ok: false, error: "A class with this name already exists.", field: "name" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create class.",
    };
  }
}

export interface UpdateClassInput {
  slug: string;
  classId: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

export type UpdateClassResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" | "code" };

export async function updateClass(
  input: UpdateClassInput
): Promise<UpdateClassResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    const name = input.name?.trim() ?? "";
    if (!name) return { ok: false, error: "Class name is required.", field: "name" };
    if (name.length > 100)
      return { ok: false, error: "Name must be 100 characters or fewer.", field: "name" };

    const code = input.code?.trim() || null;
    if (code && code.length > 20)
      return { ok: false, error: "Code must be 20 characters or fewer.", field: "code" };

    const existing = await prisma.class.findFirst({
      where: { id: input.classId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Class not found." };

    await prisma.class.update({
      where: { id: input.classId },
      data: {
        name,
        code,
        description: input.description?.trim() || null,
      },
    });

    return { ok: true };
  } catch (err: unknown) {
    console.error("[updateClass]", err);
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("name")
    ) {
      return { ok: false, error: "A class with this name already exists.", field: "name" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update class.",
    };
  }
}

export type SetClassStatusResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setClassStatus(
  slug: string,
  classId: string,
  status: ClassStatus
): Promise<SetClassStatusResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, slug);

    const existing = await prisma.class.findFirst({
      where: { id: classId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Class not found." };

    await prisma.class.update({
      where: { id: classId },
      data: { status },
    });

    return { ok: true };
  } catch (err) {
    console.error("[setClassStatus]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update class status.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASS MEMBERSHIP ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassMemberItem {
  id: string;
  personId: string;
  personName: string;
  personType: string;
  orgIdentifier: string | null;
  startDate: Date;
  endDate: Date | null;
}

export type ListClassMembersResult =
  | { ok: true; members: ClassMemberItem[] }
  | { ok: false; error: string };

export async function listClassMembers(
  slug: string,
  classId: string
): Promise<ListClassMembersResult> {
  try {
    const session = await requireSession();
    const { org } = await requireOrgMember(session.user.id, slug);

    const cls = await prisma.class.findFirst({
      where: { id: classId, organizationId: org.id },
      select: { id: true },
    });
    if (!cls) return { ok: false, error: "Class not found." };

    const memberships = await prisma.classMembership.findMany({
      where: { classId, organizationId: org.id },
      orderBy: [{ endDate: "asc" }, { person: { name: "asc" } }],
      select: {
        id: true,
        personId: true,
        startDate: true,
        endDate: true,
        person: {
          select: {
            name: true,
            personType: true,
            orgIdentifier: true,
          },
        },
      },
    });

    return {
      ok: true,
      members: memberships.map((m) => ({
        id: m.id,
        personId: m.personId,
        personName: m.person.name,
        personType: m.person.personType,
        orgIdentifier: m.person.orgIdentifier,
        startDate: m.startDate,
        endDate: m.endDate,
      })),
    };
  } catch (err) {
    console.error("[listClassMembers]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load class members.",
    };
  }
}

export interface AddClassMemberInput {
  slug: string;
  classId: string;
  personId: string;
  startDate?: Date;
}

export type AddClassMemberResult =
  | { ok: true; membership: ClassMemberItem }
  | { ok: false; error: string };

export async function addClassMember(
  input: AddClassMemberInput
): Promise<AddClassMemberResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    // Verify class and person both belong to org
    const [cls, person] = await Promise.all([
      prisma.class.findFirst({
        where: { id: input.classId, organizationId: org.id },
        select: { id: true },
      }),
      prisma.person.findFirst({
        where: { id: input.personId, organizationId: org.id },
        select: { id: true, name: true, personType: true, orgIdentifier: true },
      }),
    ]);

    if (!cls) return { ok: false, error: "Class not found." };
    if (!person) return { ok: false, error: "Person not found." };

    // Check for an existing active membership (no endDate)
    const existing = await prisma.classMembership.findFirst({
      where: {
        classId: input.classId,
        personId: input.personId,
        endDate: null,
      },
      select: { id: true },
    });
    if (existing) return { ok: false, error: "Person is already a member of this class." };

    const membership = await prisma.classMembership.create({
      data: {
        organizationId: org.id,
        classId: input.classId,
        personId: input.personId,
        startDate: input.startDate ?? new Date(),
      },
      select: {
        id: true,
        personId: true,
        startDate: true,
        endDate: true,
      },
    });

    return {
      ok: true,
      membership: {
        id: membership.id,
        personId: membership.personId,
        personName: person.name,
        personType: person.personType,
        orgIdentifier: person.orgIdentifier,
        startDate: membership.startDate,
        endDate: membership.endDate,
      },
    };
  } catch (err) {
    console.error("[addClassMember]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to add class member.",
    };
  }
}

export type RemoveClassMemberResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * End a class membership by setting endDate (preserves history).
 */
export async function removeClassMember(
  slug: string,
  membershipId: string
): Promise<RemoveClassMemberResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, slug);

    const membership = await prisma.classMembership.findFirst({
      where: { id: membershipId, organizationId: org.id },
      select: { id: true, endDate: true },
    });
    if (!membership) return { ok: false, error: "Membership not found." };
    if (membership.endDate) return { ok: false, error: "Membership has already ended." };

    await prisma.classMembership.update({
      where: { id: membershipId },
      data: { endDate: new Date() },
    });

    return { ok: true };
  } catch (err) {
    console.error("[removeClassMember]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to remove class member.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type ListSubjectsResult =
  | { ok: true; subjects: SubjectItem[] }
  | { ok: false; error: string };

export async function listSubjects(slug: string): Promise<ListSubjectsResult> {
  try {
    const session = await requireSession();
    const { org } = await requireOrgMember(session.user.id, slug);

    const subjects = await prisma.subject.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
      },
    });

    return { ok: true, subjects };
  } catch (err) {
    console.error("[listSubjects]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load subjects.",
    };
  }
}

export interface CreateSubjectInput {
  slug: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

export type CreateSubjectResult =
  | { ok: true; subject: SubjectItem }
  | { ok: false; error: string; field?: "name" | "code" };

export async function createSubject(
  input: CreateSubjectInput
): Promise<CreateSubjectResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    const name = input.name?.trim() ?? "";
    if (!name) return { ok: false, error: "Subject name is required.", field: "name" };
    if (name.length > 100)
      return { ok: false, error: "Name must be 100 characters or fewer.", field: "name" };

    const code = input.code?.trim() || null;
    if (code && code.length > 20)
      return { ok: false, error: "Code must be 20 characters or fewer.", field: "code" };

    const created = await prisma.subject.create({
      data: {
        organizationId: org.id,
        name,
        code,
        description: input.description?.trim() || null,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
      },
    });

    return { ok: true, subject: created };
  } catch (err: unknown) {
    console.error("[createSubject]", err);
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("name")
    ) {
      return { ok: false, error: "A subject with this name already exists.", field: "name" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create subject.",
    };
  }
}

export interface UpdateSubjectInput {
  slug: string;
  subjectId: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

export type UpdateSubjectResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" | "code" };

export async function updateSubject(
  input: UpdateSubjectInput
): Promise<UpdateSubjectResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    const name = input.name?.trim() ?? "";
    if (!name) return { ok: false, error: "Subject name is required.", field: "name" };
    if (name.length > 100)
      return { ok: false, error: "Name must be 100 characters or fewer.", field: "name" };

    const code = input.code?.trim() || null;
    if (code && code.length > 20)
      return { ok: false, error: "Code must be 20 characters or fewer.", field: "code" };

    const existing = await prisma.subject.findFirst({
      where: { id: input.subjectId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Subject not found." };

    await prisma.subject.update({
      where: { id: input.subjectId },
      data: { name, code, description: input.description?.trim() || null },
    });

    return { ok: true };
  } catch (err: unknown) {
    console.error("[updateSubject]", err);
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("name")
    ) {
      return { ok: false, error: "A subject with this name already exists.", field: "name" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update subject.",
    };
  }
}

export type DeleteSubjectResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteSubject(
  slug: string,
  subjectId: string
): Promise<DeleteSubjectResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, slug);

    const existing = await prisma.subject.findFirst({
      where: { id: subjectId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Subject not found." };

    // Check if any active timetable entries reference this subject
    const usageCount = await prisma.timetableEntry.count({
      where: { subjectId, status: "ACTIVE" },
    });
    if (usageCount > 0) {
      return {
        ok: false,
        error:
          "This subject is used in active timetable entries. Deactivate or remove those entries first.",
      };
    }

    await prisma.subject.delete({ where: { id: subjectId } });
    return { ok: true };
  } catch (err) {
    console.error("[deleteSubject]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete subject.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type ListRoomsResult =
  | { ok: true; rooms: RoomItem[] }
  | { ok: false; error: string };

export async function listRooms(slug: string): Promise<ListRoomsResult> {
  try {
    const session = await requireSession();
    const { org } = await requireOrgMember(session.user.id, slug);

    const rooms = await prisma.room.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        createdAt: true,
      },
    });

    return { ok: true, rooms };
  } catch (err) {
    console.error("[listRooms]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load rooms.",
    };
  }
}

export interface CreateRoomInput {
  slug: string;
  name: string;
  code?: string | null;
}

export type CreateRoomResult =
  | { ok: true; room: RoomItem }
  | { ok: false; error: string; field?: "name" | "code" };

export async function createRoom(
  input: CreateRoomInput
): Promise<CreateRoomResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    const name = input.name?.trim() ?? "";
    if (!name) return { ok: false, error: "Room name is required.", field: "name" };
    if (name.length > 100)
      return { ok: false, error: "Name must be 100 characters or fewer.", field: "name" };

    const code = input.code?.trim() || null;
    if (code && code.length > 20)
      return { ok: false, error: "Code must be 20 characters or fewer.", field: "code" };

    const created = await prisma.room.create({
      data: {
        organizationId: org.id,
        name,
        code,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        createdAt: true,
      },
    });

    return { ok: true, room: created };
  } catch (err: unknown) {
    console.error("[createRoom]", err);
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("name")
    ) {
      return { ok: false, error: "A room with this name already exists.", field: "name" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create room.",
    };
  }
}

export interface UpdateRoomInput {
  slug: string;
  roomId: string;
  name: string;
  code?: string | null;
}

export type UpdateRoomResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" | "code" };

export async function updateRoom(
  input: UpdateRoomInput
): Promise<UpdateRoomResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    const name = input.name?.trim() ?? "";
    if (!name) return { ok: false, error: "Room name is required.", field: "name" };
    if (name.length > 100)
      return { ok: false, error: "Name must be 100 characters or fewer.", field: "name" };

    const code = input.code?.trim() || null;
    if (code && code.length > 20)
      return { ok: false, error: "Code must be 20 characters or fewer.", field: "code" };

    const existing = await prisma.room.findFirst({
      where: { id: input.roomId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Room not found." };

    await prisma.room.update({
      where: { id: input.roomId },
      data: { name, code },
    });

    return { ok: true };
  } catch (err: unknown) {
    console.error("[updateRoom]", err);
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("name")
    ) {
      return { ok: false, error: "A room with this name already exists.", field: "name" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update room.",
    };
  }
}

export type DeleteRoomResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteRoom(
  slug: string,
  roomId: string
): Promise<DeleteRoomResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, slug);

    const existing = await prisma.room.findFirst({
      where: { id: roomId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Room not found." };

    // Check active timetable usage
    const usageCount = await prisma.timetableEntry.count({
      where: { roomId, status: "ACTIVE" },
    });
    if (usageCount > 0) {
      return {
        ok: false,
        error:
          "This room is used in active timetable entries. Deactivate or remove those entries first.",
      };
    }

    await prisma.room.delete({ where: { id: roomId } });
    return { ok: true };
  } catch (err) {
    console.error("[deleteRoom]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete room.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE ENTRY ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface ListTimetableEntriesInput {
  slug: string;
  classId?: string;
  teacherPersonId?: string;
  status?: TimetableStatus;
}

export type ListTimetableEntriesResult =
  | { ok: true; entries: TimetableEntryItem[] }
  | { ok: false; error: string };

export async function listTimetableEntries(
  input: ListTimetableEntriesInput
): Promise<ListTimetableEntriesResult> {
  try {
    const session = await requireSession();
    const { org } = await requireOrgMember(session.user.id, input.slug);

    const where: {
      organizationId: string;
      classId?: string;
      teacherPersonId?: string;
      status?: TimetableStatus;
    } = { organizationId: org.id };

    if (input.classId) where.classId = input.classId;
    if (input.teacherPersonId) where.teacherPersonId = input.teacherPersonId;
    where.status = input.status ?? "ACTIVE";

    const entries = await prisma.timetableEntry.findMany({
      where,
      orderBy: [{ startTime: "asc" }, { class: { name: "asc" } }],
      select: {
        id: true,
        organizationId: true,
        teacherPersonId: true,
        classId: true,
        subjectId: true,
        roomId: true,
        startTime: true,
        endTime: true,
        daysOfWeek: true,
        effectiveFrom: true,
        effectiveTo: true,
        periodLabel: true,
        status: true,
        createdAt: true,
        teacherPerson: { select: { name: true } },
        class: { select: { name: true, code: true } },
        subject: { select: { name: true } },
        room: { select: { name: true } },
      },
    });

    return {
      ok: true,
      entries: entries.map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        teacherPersonId: e.teacherPersonId,
        teacherName: e.teacherPerson.name,
        classId: e.classId,
        className: e.class.name,
        classCode: e.class.code,
        subjectId: e.subjectId,
        subjectName: e.subject.name,
        roomId: e.roomId,
        roomName: e.room?.name ?? null,
        startTime: e.startTime,
        endTime: e.endTime,
        daysOfWeek: e.daysOfWeek,
        effectiveFrom: e.effectiveFrom,
        effectiveTo: e.effectiveTo,
        periodLabel: e.periodLabel,
        status: e.status,
        createdAt: e.createdAt,
      })),
    };
  } catch (err) {
    console.error("[listTimetableEntries]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load timetable.",
    };
  }
}

export interface CreateTimetableEntryInput {
  slug: string;
  teacherPersonId: string;
  classId: string;
  subjectId: string;
  roomId?: string | null;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  daysOfWeek: string; // "1,2,3,4,5"
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  periodLabel?: string | null;
}

export type CreateTimetableEntryResult =
  | { ok: true; entry: TimetableEntryItem }
  | { ok: false; error: string; field?: string };

function validateTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}

export async function createTimetableEntry(
  input: CreateTimetableEntryInput
): Promise<CreateTimetableEntryResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    // Validate required fields
    if (!input.teacherPersonId)
      return { ok: false, error: "Teacher is required.", field: "teacherPersonId" };
    if (!input.classId)
      return { ok: false, error: "Class is required.", field: "classId" };
    if (!input.subjectId)
      return { ok: false, error: "Subject is required.", field: "subjectId" };
    if (!validateTime(input.startTime))
      return { ok: false, error: "Start time must be in HH:MM format.", field: "startTime" };
    if (!validateTime(input.endTime))
      return { ok: false, error: "End time must be in HH:MM format.", field: "endTime" };
    if (input.startTime >= input.endTime)
      return { ok: false, error: "Start time must be before end time.", field: "startTime" };
    if (!input.daysOfWeek?.trim())
      return { ok: false, error: "At least one day of the week is required.", field: "daysOfWeek" };
    if (!input.effectiveFrom)
      return { ok: false, error: "Effective from date is required.", field: "effectiveFrom" };

    // Verify entities belong to org
    const [teacher, cls, subject, room] = await Promise.all([
      prisma.person.findFirst({
        where: { id: input.teacherPersonId, organizationId: org.id },
        select: { id: true, name: true },
      }),
      prisma.class.findFirst({
        where: { id: input.classId, organizationId: org.id },
        select: { id: true, name: true, code: true },
      }),
      prisma.subject.findFirst({
        where: { id: input.subjectId, organizationId: org.id },
        select: { id: true, name: true },
      }),
      input.roomId
        ? prisma.room.findFirst({
            where: { id: input.roomId, organizationId: org.id },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    if (!teacher) return { ok: false, error: "Teacher not found.", field: "teacherPersonId" };
    if (!cls) return { ok: false, error: "Class not found.", field: "classId" };
    if (!subject) return { ok: false, error: "Subject not found.", field: "subjectId" };
    if (input.roomId && !room) return { ok: false, error: "Room not found.", field: "roomId" };

    const created = await prisma.timetableEntry.create({
      data: {
        organizationId: org.id,
        teacherPersonId: input.teacherPersonId,
        classId: input.classId,
        subjectId: input.subjectId,
        roomId: input.roomId || null,
        startTime: input.startTime,
        endTime: input.endTime,
        daysOfWeek: input.daysOfWeek.trim(),
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null,
        periodLabel: input.periodLabel?.trim() || null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        organizationId: true,
        teacherPersonId: true,
        classId: true,
        subjectId: true,
        roomId: true,
        startTime: true,
        endTime: true,
        daysOfWeek: true,
        effectiveFrom: true,
        effectiveTo: true,
        periodLabel: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ok: true,
      entry: {
        id: created.id,
        organizationId: created.organizationId,
        teacherPersonId: created.teacherPersonId,
        teacherName: teacher.name,
        classId: created.classId,
        className: cls.name,
        classCode: cls.code,
        subjectId: created.subjectId,
        subjectName: subject.name,
        roomId: created.roomId,
        roomName: room?.name ?? null,
        startTime: created.startTime,
        endTime: created.endTime,
        daysOfWeek: created.daysOfWeek,
        effectiveFrom: created.effectiveFrom,
        effectiveTo: created.effectiveTo,
        periodLabel: created.periodLabel,
        status: created.status,
        createdAt: created.createdAt,
      },
    };
  } catch (err) {
    console.error("[createTimetableEntry]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create timetable entry.",
    };
  }
}

export interface UpdateTimetableEntryInput extends CreateTimetableEntryInput {
  entryId: string;
}

export type UpdateTimetableEntryResult =
  | { ok: true }
  | { ok: false; error: string; field?: string };

export async function updateTimetableEntry(
  input: UpdateTimetableEntryInput
): Promise<UpdateTimetableEntryResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    if (!validateTime(input.startTime))
      return { ok: false, error: "Start time must be in HH:MM format.", field: "startTime" };
    if (!validateTime(input.endTime))
      return { ok: false, error: "End time must be in HH:MM format.", field: "endTime" };
    if (input.startTime >= input.endTime)
      return { ok: false, error: "Start time must be before end time.", field: "startTime" };
    if (!input.daysOfWeek?.trim())
      return { ok: false, error: "At least one day is required.", field: "daysOfWeek" };

    const existing = await prisma.timetableEntry.findFirst({
      where: { id: input.entryId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Timetable entry not found." };

    // Verify references
    const [teacher, cls, subject, room] = await Promise.all([
      prisma.person.findFirst({
        where: { id: input.teacherPersonId, organizationId: org.id },
        select: { id: true },
      }),
      prisma.class.findFirst({
        where: { id: input.classId, organizationId: org.id },
        select: { id: true },
      }),
      prisma.subject.findFirst({
        where: { id: input.subjectId, organizationId: org.id },
        select: { id: true },
      }),
      input.roomId
        ? prisma.room.findFirst({
            where: { id: input.roomId, organizationId: org.id },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!teacher) return { ok: false, error: "Teacher not found.", field: "teacherPersonId" };
    if (!cls) return { ok: false, error: "Class not found.", field: "classId" };
    if (!subject) return { ok: false, error: "Subject not found.", field: "subjectId" };
    if (input.roomId && !room) return { ok: false, error: "Room not found.", field: "roomId" };

    await prisma.timetableEntry.update({
      where: { id: input.entryId },
      data: {
        teacherPersonId: input.teacherPersonId,
        classId: input.classId,
        subjectId: input.subjectId,
        roomId: input.roomId || null,
        startTime: input.startTime,
        endTime: input.endTime,
        daysOfWeek: input.daysOfWeek.trim(),
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null,
        periodLabel: input.periodLabel?.trim() || null,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[updateTimetableEntry]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update timetable entry.",
    };
  }
}

export type SetTimetableEntryStatusResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setTimetableEntryStatus(
  slug: string,
  entryId: string,
  status: TimetableStatus
): Promise<SetTimetableEntryStatusResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, slug);

    const existing = await prisma.timetableEntry.findFirst({
      where: { id: entryId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Timetable entry not found." };

    await prisma.timetableEntry.update({
      where: { id: entryId },
      data: { status },
    });

    return { ok: true };
  } catch (err) {
    console.error("[setTimetableEntryStatus]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update entry status.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE EXCEPTION ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type ListTimetableExceptionsResult =
  | { ok: true; exceptions: TimetableExceptionItem[] }
  | { ok: false; error: string };

export async function listTimetableExceptions(
  slug: string,
  entryId: string
): Promise<ListTimetableExceptionsResult> {
  try {
    const session = await requireSession();
    const { org } = await requireOrgMember(session.user.id, slug);

    const entry = await prisma.timetableEntry.findFirst({
      where: { id: entryId, organizationId: org.id },
      select: { id: true },
    });
    if (!entry) return { ok: false, error: "Timetable entry not found." };

    const exceptions = await prisma.timetableException.findMany({
      where: { timetableEntryId: entryId },
      orderBy: { exceptionDate: "asc" },
      select: {
        id: true,
        organizationId: true,
        timetableEntryId: true,
        exceptionDate: true,
        exceptionType: true,
        newDate: true,
        newStartTime: true,
        newEndTime: true,
        substitutePersonId: true,
        newRoomId: true,
        note: true,
        createdAt: true,
        substitutePerson: { select: { name: true } },
      },
    });

    // Load new room names separately for exceptions with room changes
    const roomIds = exceptions
      .map((e) => e.newRoomId)
      .filter((id): id is string => id !== null);

    const rooms =
      roomIds.length > 0
        ? await prisma.room.findMany({
            where: { id: { in: roomIds } },
            select: { id: true, name: true },
          })
        : [];
    const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

    return {
      ok: true,
      exceptions: exceptions.map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        timetableEntryId: e.timetableEntryId,
        exceptionDate: e.exceptionDate,
        exceptionType: e.exceptionType,
        newDate: e.newDate,
        newStartTime: e.newStartTime,
        newEndTime: e.newEndTime,
        substitutePersonId: e.substitutePersonId,
        substitutePersonName: e.substitutePerson?.name ?? null,
        newRoomId: e.newRoomId,
        newRoomName: e.newRoomId ? (roomMap.get(e.newRoomId) ?? null) : null,
        note: e.note,
        createdAt: e.createdAt,
      })),
    };
  } catch (err) {
    console.error("[listTimetableExceptions]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load exceptions.",
    };
  }
}

export interface CreateTimetableExceptionInput {
  slug: string;
  timetableEntryId: string;
  exceptionDate: Date;
  exceptionType: ExceptionType;
  newDate?: Date | null;
  newStartTime?: string | null;
  newEndTime?: string | null;
  substitutePersonId?: string | null;
  newRoomId?: string | null;
  note?: string | null;
}

export type CreateTimetableExceptionResult =
  | { ok: true; exception: TimetableExceptionItem }
  | { ok: false; error: string; field?: string };

export async function createTimetableException(
  input: CreateTimetableExceptionInput
): Promise<CreateTimetableExceptionResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, input.slug);

    const entry = await prisma.timetableEntry.findFirst({
      where: { id: input.timetableEntryId, organizationId: org.id },
      select: { id: true },
    });
    if (!entry) return { ok: false, error: "Timetable entry not found." };

    // Validate optional time fields
    if (input.newStartTime && !validateTime(input.newStartTime))
      return { ok: false, error: "New start time must be in HH:MM format.", field: "newStartTime" };
    if (input.newEndTime && !validateTime(input.newEndTime))
      return { ok: false, error: "New end time must be in HH:MM format.", field: "newEndTime" };
    if (
      input.newStartTime &&
      input.newEndTime &&
      input.newStartTime >= input.newEndTime
    ) {
      return { ok: false, error: "New start time must be before new end time.", field: "newStartTime" };
    }

    // Verify substitute/room belong to org if provided
    if (input.substitutePersonId) {
      const sub = await prisma.person.findFirst({
        where: { id: input.substitutePersonId, organizationId: org.id },
        select: { id: true },
      });
      if (!sub) return { ok: false, error: "Substitute teacher not found.", field: "substitutePersonId" };
    }
    if (input.newRoomId) {
      const room = await prisma.room.findFirst({
        where: { id: input.newRoomId, organizationId: org.id },
        select: { id: true },
      });
      if (!room) return { ok: false, error: "Room not found.", field: "newRoomId" };
    }

    const created = await prisma.timetableException.create({
      data: {
        organizationId: org.id,
        timetableEntryId: input.timetableEntryId,
        exceptionDate: input.exceptionDate,
        exceptionType: input.exceptionType,
        newDate: input.newDate ?? null,
        newStartTime: input.newStartTime ?? null,
        newEndTime: input.newEndTime ?? null,
        substitutePersonId: input.substitutePersonId ?? null,
        newRoomId: input.newRoomId ?? null,
        note: input.note?.trim() || null,
      },
      select: {
        id: true,
        organizationId: true,
        timetableEntryId: true,
        exceptionDate: true,
        exceptionType: true,
        newDate: true,
        newStartTime: true,
        newEndTime: true,
        substitutePersonId: true,
        newRoomId: true,
        note: true,
        createdAt: true,
        substitutePerson: { select: { name: true } },
      },
    });

    let newRoomName: string | null = null;
    if (created.newRoomId) {
      const room = await prisma.room.findFirst({
        where: { id: created.newRoomId },
        select: { name: true },
      });
      newRoomName = room?.name ?? null;
    }

    return {
      ok: true,
      exception: {
        id: created.id,
        organizationId: created.organizationId,
        timetableEntryId: created.timetableEntryId,
        exceptionDate: created.exceptionDate,
        exceptionType: created.exceptionType,
        newDate: created.newDate,
        newStartTime: created.newStartTime,
        newEndTime: created.newEndTime,
        substitutePersonId: created.substitutePersonId,
        substitutePersonName: created.substitutePerson?.name ?? null,
        newRoomId: created.newRoomId,
        newRoomName,
        note: created.note,
        createdAt: created.createdAt,
      },
    };
  } catch (err: unknown) {
    console.error("[createTimetableException]", err);
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint")
    ) {
      return {
        ok: false,
        error: "An exception already exists for this entry on that date.",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create exception.",
    };
  }
}

export type DeleteTimetableExceptionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteTimetableException(
  slug: string,
  exceptionId: string
): Promise<DeleteTimetableExceptionResult> {
  try {
    const session = await requireSession();
    const { org } = await requireAdmin(session.user.id, slug);

    const existing = await prisma.timetableException.findFirst({
      where: { id: exceptionId, organizationId: org.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Exception not found." };

    await prisma.timetableException.delete({ where: { id: exceptionId } });
    return { ok: true };
  } catch (err) {
    console.error("[deleteTimetableException]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete exception.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE VIEW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a teacher's full schedule: their timetable entries with exceptions.
 * Used for the "My Timetable" view.
 */
export type GetTeacherTimetableResult =
  | { ok: true; entries: TimetableEntryItem[] }
  | { ok: false; error: string };

export async function getTeacherTimetable(
  slug: string,
  teacherPersonId: string
): Promise<GetTeacherTimetableResult> {
  return listTimetableEntries({ slug, teacherPersonId, status: "ACTIVE" });
}

/**
 * Get a class's full schedule.
 * Used for the "Class Timetable" view.
 */
export type GetClassTimetableResult =
  | { ok: true; entries: TimetableEntryItem[] }
  | { ok: false; error: string };

export async function getClassTimetable(
  slug: string,
  classId: string
): Promise<GetClassTimetableResult> {
  return listTimetableEntries({ slug, classId, status: "ACTIVE" });
}
