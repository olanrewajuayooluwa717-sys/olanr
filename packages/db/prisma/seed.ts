import { prisma } from '../src/index';
import bcrypt from 'bcryptjs';

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'logunsina@yahoo.com' },
    update: { passwordHash },
    create: {
      email: 'logunsina@yahoo.com',
      name: 'AYOOLUWA OGUNSINA',
      passwordHash,
      role: 'member',
      subscriptionTier: 'standard',
      subscriptionStatus: 'active',
    },
  });

  const existing = await prisma.farm.findFirst({ where: { userId: user.id, name: 'Fishmaster Foods Ltd' } });
  if (existing) {
    console.log('Seed data already exists');
    return;
  }

  const farm = await prisma.farm.create({
    data: {
      userId: user.id,
      name: 'Fishmaster Foods Ltd',
      location: 'AKOBO',
      city: 'Ibadan',
      state: 'Oyo',
      country: 'Nigeria',
      ponds: {
        create: {
          name: 'fishmaster 1',
          number: 12,
          lengthM: 2,
          widthM: 3,
          depthM: 1.3,
          cycles: {
            create: {
              quantityStocked: 2500,
              averageWeightAtStockingG: 8,
              fingerlingPrice: 30,
              stockingDate: new Date('2021-01-31'),
              desiredCrudeProteinPct: 38,
              desiredFeedQuantityKg: 1500,
            },
          },
        },
      },
    },
    include: { ponds: { include: { cycles: true } } },
  });

  console.log('Seeded farm:', farm.name, 'cycle:', farm.ponds[0]?.cycles[0]?.id);

  // Super admin for panel access
  const adminHash = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@fishmaster.app' },
    update: { passwordHash: adminHash, role: 'super_admin' },
    create: {
      email: 'admin@fishmaster.app',
      name: 'Fishmaster Admin',
      passwordHash: adminHash,
      role: 'super_admin',
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
    },
  });
  console.log('Admin: admin@fishmaster.app / admin1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
