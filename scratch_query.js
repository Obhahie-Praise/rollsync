const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { name: { contains: 'TEST International', mode: 'insensitive' } },
    include: {
      classes: {
        where: { name: { contains: 'SS3', mode: 'insensitive' } },
        include: {
          teachers: {
            include: { person: true, subject: true }
          },
          subjects: true,
          students: true
        }
      },
      persons: {
        where: { type: 'TEACHER' }
      }
    }
  });
  console.log(JSON.stringify(orgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
