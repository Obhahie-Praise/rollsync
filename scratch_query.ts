import fs from 'fs';
import path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';

// Parse .env
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

async function main() {
  // 1. Find the org (case-insensitive)
  const orgs = await prisma.organization.findMany();
  const org = orgs.find((o: any) =>
    o.name.toLowerCase().includes('test') && o.name.toLowerCase().includes('international')
  );
  if (!org) {
    console.log('No matching org found. All orgs:', orgs.map((o: any) => o.name));
    return;
  }
  console.log(`\n=== Organization: ${org.name} (${org.id}) ===\n`);

  // 2. Classes
  const classes = await prisma.class.findMany({ where: { organizationId: org.id } });
  console.log('Classes:', classes.map((c: any) => `${c.name} (${c.id})`));

  // 3. Teachers
  const teachers = await prisma.person.findMany({
    where: { organizationId: org.id, personType: 'TEACHER' }
  });
  console.log('\nTeachers:', teachers.map((t: any) => `${t.name} (${t.id})`));

  // 4. Subjects
  const subjects = await prisma.subject.findMany({
    where: { organizationId: org.id }
  });
  console.log('\nSubjects:', subjects.map((s: any) => `${s.name} (${s.id})`));

  // 5. Existing timetable entries
  const entries = await prisma.timetableEntry.findMany({
    where: { organizationId: org.id },
    include: { teacherPerson: true, class: true, subject: true }
  });
  console.log(`\nExisting timetable entries: ${entries.length}`);
  for (const e of entries) {
    console.log(`  Day ${e.dayOfWeek} | ${e.startTime}-${e.endTime} | ${e.subject.name} | ${e.teacherPerson.name} | ${e.class.name} | ${e.periodLabel || ''}`);
  }

  // 6. Rooms
  const rooms = await prisma.room.findMany({ where: { organizationId: org.id } });
  console.log('\nRooms:', rooms.length > 0 ? rooms.map((r: any) => r.name) : '(none)');

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
