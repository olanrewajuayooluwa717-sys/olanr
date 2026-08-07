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
  if (!existing) {
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
  } else {
    console.log('Farm seed already exists');
  }

  const adminHash = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
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

  const existingAdvert = await prisma.contentPost.findFirst({
    where: { type: 'advert', authorId: admin.id },
  });
  if (!existingAdvert) {
    await prisma.contentPost.create({
      data: {
        type: 'advert',
        title: 'Welcome to Fishmaster',
        body: 'Educational adverts and farm tips appear here for all members. Admins publish from the backend → Send to all.',
        authorId: admin.id,
        published: true,
      },
    });
    console.log('Seeded sample advert');
  }

  const cycle = await prisma.stockCycle.findFirst({ orderBy: { createdAt: 'asc' } });
  if (cycle) {
    for (let m = 1; m <= 6; m++) {
      await prisma.feedBrandMonth.upsert({
        where: { stockCycleId_month: { stockCycleId: cycle.id, month: m } },
        update: {},
        create: {
          stockCycleId: cycle.id,
          month: m,
          brand: 'Skretting',
          feedSizeMm: m <= 2 ? 2 : m <= 4 ? 4 : 6,
          costPerBag: 18500,
          crudeProteinPct: 38,
        },
      });
    }
    console.log('Seeded feed brands for demo cycle');

    const ingredients: { name: string; costPerKg: number }[] = [
      { name: 'Soybean meal', costPerKg: 420 },
      { name: 'Fish meal', costPerKg: 680 },
      { name: 'Maize', costPerKg: 280 },
      { name: 'Wheat', costPerKg: 310 },
      { name: 'Lysine', costPerKg: 2400 },
      { name: 'Methionine', costPerKg: 3200 },
      { name: 'Palm oil', costPerKg: 950 },
      { name: 'Vitamin premix', costPerKg: 4500 },
    ];
    for (const ing of ingredients) {
      await prisma.feedIngredientCost.upsert({
        where: {
          stockCycleId_ingredientName: { stockCycleId: cycle.id, ingredientName: ing.name },
        },
        update: { costPerKg: ing.costPerKg },
        create: { stockCycleId: cycle.id, ingredientName: ing.name, costPerKg: ing.costPerKg },
      });
    }
    console.log('Seeded feed ingredient costs');

    await prisma.miscCostLog.createMany({
      data: [
        { stockCycleId: cycle.id, date: new Date('2021-02-15'), category: 'salary', amount: 45000, notes: 'Pond attendant' },
        { stockCycleId: cycle.id, date: new Date('2021-03-01'), category: 'transport', amount: 12000, notes: 'Fingerling delivery' },
        { stockCycleId: cycle.id, date: new Date('2021-03-10'), category: 'chemicals', amount: 8500, notes: 'Lime & probiotics' },
      ],
      skipDuplicates: true,
    });
    console.log('Seeded misc costs');

    await prisma.fishSaleLog.createMany({
      data: [
        {
          stockCycleId: cycle.id,
          date: new Date('2021-05-20'),
          quantitySold: 200,
          avgWeightG: 850,
          totalRevenue: 340000,
          customerName: 'Local market buyer',
        },
      ],
      skipDuplicates: true,
    });
    console.log('Seeded sample fish sale');

    await prisma.dailyPowerLog.createMany({
      data: [
        { stockCycleId: cycle.id, date: new Date('2021-02-01'), electricityKwh: 12, dieselLiters: 5 },
        { stockCycleId: cycle.id, date: new Date('2021-02-02'), electricityKwh: 10, dieselLiters: 4 },
      ],
      skipDuplicates: true,
    });
    console.log('Seeded power logs');
  }

  const demoFarm = await prisma.farm.findFirst({ where: { name: 'Fishmaster Foods Ltd' } });
  if (demoFarm && demoFarm.latitude == null) {
    await prisma.farm.update({
      where: { id: demoFarm.id },
      data: { latitude: 7.3775, longitude: 3.9470 },
    });
    console.log('Seeded demo farm GPS (Ibadan area)');
  }

  // Global ingredients (25 legacy) — keep in sync with LEGACY_INGREDIENTS in shared-types
  const legacyIngredients: {
    name: string;
    foodClass: 'protein' | 'carbohydrate' | 'others';
    crudeProteinPct: number;
    inclusionRatio: number;
    composition?: string;
  }[] = [
    { name: '72% Fish meal', foodClass: 'protein', crudeProteinPct: 72, inclusionRatio: 0.15, composition: 'Fish meal' },
    { name: 'Yeast', foodClass: 'protein', crudeProteinPct: 45, inclusionRatio: 0.03, composition: 'Brewers yeast' },
    { name: 'Poultry meal', foodClass: 'protein', crudeProteinPct: 60, inclusionRatio: 0.1, composition: 'Poultry by-product' },
    { name: 'Groundnut cake', foodClass: 'protein', crudeProteinPct: 45, inclusionRatio: 0.12, composition: 'Groundnut cake' },
    { name: '65% Fish meal', foodClass: 'protein', crudeProteinPct: 65, inclusionRatio: 0.12, composition: 'Fish meal' },
    { name: 'Soya meal', foodClass: 'protein', crudeProteinPct: 44, inclusionRatio: 0.2, composition: 'Soybean meal' },
    { name: 'Fullfat soya', foodClass: 'protein', crudeProteinPct: 36, inclusionRatio: 0.08, composition: 'Full-fat soybean' },
    { name: 'Blood meal 1', foodClass: 'protein', crudeProteinPct: 80, inclusionRatio: 0.03, composition: 'Blood meal' },
    { name: 'Blood meal 2', foodClass: 'protein', crudeProteinPct: 85, inclusionRatio: 0.02, composition: 'Blood meal' },
    { name: 'Maize', foodClass: 'carbohydrate', crudeProteinPct: 9, inclusionRatio: 0.25, composition: 'Maize grain' },
    { name: 'Wheat flour', foodClass: 'carbohydrate', crudeProteinPct: 11, inclusionRatio: 0.1, composition: 'Wheat flour' },
    { name: 'Cassava flour', foodClass: 'carbohydrate', crudeProteinPct: 2, inclusionRatio: 0.08, composition: 'Cassava flour' },
    { name: 'Rice bran', foodClass: 'carbohydrate', crudeProteinPct: 12, inclusionRatio: 0.1, composition: 'Rice bran' },
    { name: 'Cassava crumbs', foodClass: 'carbohydrate', crudeProteinPct: 2.5, inclusionRatio: 0.05, composition: 'Cassava crumbs' },
    { name: 'Vitamin C', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.001, composition: 'Ascorbic acid' },
    { name: 'Methionine', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.003, composition: 'DL-Methionine' },
    { name: 'Lysine', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.004, composition: 'L-Lysine' },
    { name: 'Vitamin premix', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.005, composition: 'Vitamin premix' },
    { name: 'Oxytetracycline', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.0005, composition: 'Antibiotic premix' },
    { name: 'Bone meal', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.02, composition: 'Bone meal' },
    { name: 'Dicalcium phosphate', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.015, composition: 'DCP' },
    { name: 'Probiotic', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.001, composition: 'Probiotic blend' },
    { name: 'Poultry oil', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.03, composition: 'Poultry fat' },
    { name: 'Soya oil', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.02, composition: 'Soybean oil' },
    { name: 'Anti toxin', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.001, composition: 'Mycotoxin binder' },
  ];
  for (const ing of legacyIngredients) {
    await prisma.globalIngredient.upsert({
      where: { name: ing.name },
      update: {
        crudeProteinPct: ing.crudeProteinPct,
        inclusionRatio: ing.inclusionRatio,
        composition: ing.composition ?? null,
        foodClass: ing.foodClass,
      },
      create: {
        name: ing.name,
        crudeProteinPct: ing.crudeProteinPct,
        inclusionRatio: ing.inclusionRatio,
        composition: ing.composition ?? null,
        foodClass: ing.foodClass,
      },
    });
  }
  console.log(`Seeded ${legacyIngredients.length} global ingredients`);

  // FCR months 1–6 — matches DEFAULT_FCR_COEFFICIENTS in calc-engine
  const fcrDefaults = [
    { month: 1, fcr: 0.6, bodyWeightPct: 0.045 },
    { month: 2, fcr: 0.75, bodyWeightPct: 0.033 },
    { month: 3, fcr: 0.8, bodyWeightPct: 0.02 },
    { month: 4, fcr: 0.8, bodyWeightPct: 0.02 },
    { month: 5, fcr: 1.0, bodyWeightPct: 0.01 },
    { month: 6, fcr: 1.1, bodyWeightPct: 0.012 },
  ];
  for (const row of fcrDefaults) {
    await prisma.fcrMonthConfig.upsert({
      where: { month: row.month },
      update: { bodyWeightPct: row.bodyWeightPct, fcr: row.fcr },
      create: { month: row.month, bodyWeightPct: row.bodyWeightPct, fcr: row.fcr },
    });
  }
  console.log('Seeded FCR month configs');

  // Sample marketplace category + product if a farm exists
  const anyFarm = await prisma.farm.findFirst({ orderBy: { createdAt: 'asc' } });
  if (anyFarm) {
    let category = await prisma.marketCategory.findFirst({ where: { title: 'Fresh fish' } });
    if (!category) {
      category = await prisma.marketCategory.create({
        data: {
          title: 'Fresh fish',
          description: 'Live and fresh table-size catfish from member farms',
        },
      });
      console.log('Seeded marketplace category: Fresh fish');
    }
    const existingProduct = await prisma.marketProduct.findFirst({
      where: { farmId: anyFarm.id, name: 'Table-size catfish' },
    });
    if (!existingProduct) {
      await prisma.marketProduct.create({
        data: {
          farmId: anyFarm.id,
          categoryId: category.id,
          name: 'Table-size catfish',
          price: 1800,
          quantity: 50,
          description: 'Sample listing — ~1kg average weight, farm-gate price per kg',
          sold: false,
        },
      });
      console.log('Seeded sample marketplace product');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
