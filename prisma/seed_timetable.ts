/**
 * Timetable Seed for TEST International Academy → SS3 Platinum
 *
 * Clears existing timetable entries for SS3 Platinum, then creates
 * a realistic 5-day × 6-period weekly schedule.
 *
 * Period structure:
 *   Period 1: 08:00 – 09:00
 *   Period 2: 09:00 – 10:00
 *   Period 3: 10:00 – 11:00
 *   Period 4: 11:00 – 12:00
 *   BREAK:    12:00 – 12:30
 *   Period 5: 12:30 – 13:20
 *   Period 6: 13:20 – 14:10
 *
 * Teachers & subjects:
 *   Further Maths       → Best Anthony
 *   Biology              → Peculiar
 *   Mathematics          → Charles Omoregie
 *   Chemistry            → Francis
 *   Physics Mechanics    → Seriki
 *   Physics Electricity  → Ayo
 *
 * 30 slots total, distributed realistically across the week.
 */

import fs from 'fs';
import path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// ── Load .env ────────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split(/\r?\n/)) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) {
    const [, key, rawVal] = match;
    process.env[key] = rawVal.trim().replace(/^['"](.*)['"]$/, '$1');
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not found in .env');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ── Periods ──────────────────────────────────────────────────────────────
const PERIODS = [
  { label: 'Period 1', start: '08:00', end: '09:00' },
  { label: 'Period 2', start: '09:00', end: '10:00' },
  { label: 'Period 3', start: '10:00', end: '11:00' },
  { label: 'Period 4', start: '11:00', end: '12:00' },
  // BREAK 12:00 – 12:30
  { label: 'Period 5', start: '12:30', end: '13:20' },
  { label: 'Period 6', start: '13:20', end: '14:10' },
];

// dayOfWeek: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri (JS getDay() convention)

// ── Realistic weekly timetable ──────────────────────────────────────────
// Each day has 6 subject slots (by name), distributed so:
//   - Every subject appears 5× per week (30 slots / 6 subjects = 5)
//   - No teacher has two concurrent periods on the same day (guaranteed
//     because each teacher has exactly one subject)
//   - Adjacent periods on the same day vary
//   - The pattern is not a simple rotation — it looks like a real school

type SubjectKey =
  | 'Mathematics'
  | 'Biology'
  | 'Chemistry'
  | 'Physics Mechanics'
  | 'Further Maths'
  | 'Physics Electricity';

const WEEKLY_SCHEDULE: Record<number, SubjectKey[]> = {
  // Monday
  1: [
    'Mathematics',          // 08:00
    'Biology',              // 09:00
    'Chemistry',            // 10:00
    'Physics Mechanics',    // 11:00
    // BREAK
    'Further Maths',        // 12:30
    'Physics Electricity',  // 13:20
  ],
  // Tuesday
  2: [
    'Biology',              // 08:00
    'Further Maths',        // 09:00
    'Mathematics',          // 10:00
    'Physics Electricity',  // 11:00
    // BREAK
    'Chemistry',            // 12:30
    'Physics Mechanics',    // 13:20
  ],
  // Wednesday
  3: [
    'Chemistry',            // 08:00
    'Mathematics',          // 09:00
    'Physics Electricity',  // 10:00
    'Biology',              // 11:00
    // BREAK
    'Physics Mechanics',    // 12:30
    'Further Maths',        // 13:20
  ],
  // Thursday
  4: [
    'Further Maths',        // 08:00
    'Physics Mechanics',    // 09:00
    'Biology',              // 10:00
    'Mathematics',          // 11:00
    // BREAK
    'Physics Electricity',  // 12:30
    'Chemistry',            // 13:20
  ],
  // Friday
  5: [
    'Physics Electricity',  // 08:00
    'Chemistry',            // 09:00
    'Further Maths',        // 10:00
    'Physics Mechanics',    // 11:00
    // BREAK
    'Mathematics',          // 12:30
    'Biology',              // 13:20
  ],
};

// ── Teacher-Subject assignments ─────────────────────────────────────────
const ASSIGNMENTS: Record<SubjectKey, string> = {
  'Further Maths':        'Best Anthony',
  'Biology':              'Peculiar',
  'Mathematics':          'Charles Omoregie',
  'Chemistry':            'Francis',
  'Physics Mechanics':    'Seriki',
  'Physics Electricity':  'Ayo',
};

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  // 1. Find the organization (case-insensitive partial match)
  const orgs = await prisma.organization.findMany();
  const org = orgs.find((o) =>
    o.name.toLowerCase().includes('test') &&
    o.name.toLowerCase().includes('international')
  );
  if (!org) {
    console.error('❌ Organization not found. Available:', orgs.map((o) => o.name));
    process.exit(1);
  }
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // 2. Find SS3 Platinum (case-insensitive)
  const classes = await prisma.class.findMany({ where: { organizationId: org.id } });
  const ss3Platinum = classes.find((c) =>
    c.name.toLowerCase().includes('ss') &&
    c.name.toLowerCase().includes('3') &&
    c.name.toLowerCase().includes('platinum')
  );
  if (!ss3Platinum) {
    console.error('❌ Class SS3 Platinum not found. Available:', classes.map((c) => c.name));
    process.exit(1);
  }
  console.log(`✅ Class: ${ss3Platinum.name} (${ss3Platinum.id})`);

  // 3. Fetch and map teachers
  const teachers = await prisma.person.findMany({
    where: { organizationId: org.id, personType: 'TEACHER' },
  });
  console.log(`✅ Found ${teachers.length} teachers`);

  const findTeacher = (name: string) => {
    const found = teachers.find((t) =>
      t.name.toLowerCase().includes(name.toLowerCase())
    );
    if (!found) {
      console.error(`❌ Teacher "${name}" not found. Available:`, teachers.map((t) => t.name));
      process.exit(1);
    }
    return found;
  };

  // 4. Fetch and map subjects
  const subjects = await prisma.subject.findMany({
    where: { organizationId: org.id },
  });
  console.log(`✅ Found ${subjects.length} subjects`);

  const findSubject = (name: string) => {
    const found = subjects.find((s) =>
      s.name.toLowerCase().includes(name.toLowerCase())
    );
    if (!found) {
      console.error(`❌ Subject "${name}" not found. Available:`, subjects.map((s) => s.name));
      process.exit(1);
    }
    return found;
  };

  // 5. Validate all assignments resolve
  const resolvedAssignments: Record<SubjectKey, { teacherId: string; subjectId: string }> = {} as any;
  for (const [subjectName, teacherName] of Object.entries(ASSIGNMENTS)) {
    const teacher = findTeacher(teacherName);
    const subject = findSubject(subjectName);
    resolvedAssignments[subjectName as SubjectKey] = {
      teacherId: teacher.id,
      subjectId: subject.id,
    };
    console.log(`  📌 ${subjectName} → ${teacher.name}`);
  }

  // 6. Clear existing timetable for this class
  const deleted = await prisma.timetableEntry.deleteMany({
    where: {
      organizationId: org.id,
      classId: ss3Platinum.id,
    },
  });
  console.log(`\n🗑️  Cleared ${deleted.count} existing timetable entries for ${ss3Platinum.name}`);

  // 7. Build and insert new timetable entries
  const now = new Date();
  const entriesToCreate: Array<{
    organizationId: string;
    teacherPersonId: string;
    classId: string;
    subjectId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    periodLabel: string;
    effectiveFrom: Date;
    status: 'ACTIVE';
  }> = [];

  for (const [dayStr, daySubjects] of Object.entries(WEEKLY_SCHEDULE)) {
    const day = Number(dayStr);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];

    for (let i = 0; i < PERIODS.length; i++) {
      const period = PERIODS[i];
      const subjectName = daySubjects[i];
      const assignment = resolvedAssignments[subjectName];

      entriesToCreate.push({
        organizationId: org.id,
        teacherPersonId: assignment.teacherId,
        classId: ss3Platinum.id,
        subjectId: assignment.subjectId,
        dayOfWeek: day,
        startTime: period.start,
        endTime: period.end,
        periodLabel: period.label,
        effectiveFrom: now,
        status: 'ACTIVE',
      });

      console.log(`  ${dayName} ${period.label} ${period.start}–${period.end} → ${subjectName}`);
    }
  }

  const result = await prisma.timetableEntry.createMany({
    data: entriesToCreate,
  });

  console.log(`\n✅ Successfully seeded ${result.count} timetable entries for ${ss3Platinum.name}`);

  // 8. Verification — print subject occurrence counts
  console.log('\n── Subject distribution ──');
  const counts: Record<string, number> = {};
  for (const daySubjects of Object.values(WEEKLY_SCHEDULE)) {
    for (const s of daySubjects) {
      counts[s] = (counts[s] || 0) + 1;
    }
  }
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name}: ${count}× per week`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
