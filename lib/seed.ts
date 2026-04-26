import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  // Hash passwords
  const hash = await bcrypt.hash('Welcome@123', 12);

  // ─── 1. Create the Founder (Super Admin) ────────────────────────────
  const avik = await prisma.user.upsert({
    where: { email: 'avik@antigravity.in' },
    update: {},
    create: {
      email: 'avik@antigravity.in',
      password: hash,
      name: 'Avik Das',
      role: 'SUPER_ADMIN',
      department: 'Leadership',
      designation: 'Founder',
      phone: '+91-9876543210',
      workLocation: 'Kolkata HQ',
      joinDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('✅ Created: Avik Das (Founder / Super Admin)');

  // ─── 2. Create Business Head (HR Admin) ─────────────────────────────
  const shreyasi = await prisma.user.upsert({
    where: { email: 'shreyasi@antigravity.in' },
    update: {},
    create: {
      email: 'shreyasi@antigravity.in',
      password: hash,
      name: 'Shreyasi Mukherjee',
      role: 'HR_ADMIN',
      department: 'Business',
      designation: 'Business Head',
      phone: '+91-9876543211',
      workLocation: 'Kolkata HQ',
      managerId: avik.id,
      joinDate: new Date('2024-01-15'),
      isActive: true,
    },
  });
  console.log('✅ Created: Shreyasi Mukherjee (Business Head / HR Admin)');

  // ─── 3. Create Tech Lead (Manager) ──────────────────────────────────
  const priyanka = await prisma.user.upsert({
    where: { email: 'priyanka@antigravity.in' },
    update: {},
    create: {
      email: 'priyanka@antigravity.in',
      password: hash,
      name: 'Priyanka Sonkher',
      role: 'MANAGER',
      department: 'Technology',
      designation: 'Tech Lead',
      phone: '+91-9876543212',
      workLocation: 'Kolkata HQ',
      managerId: avik.id,
      joinDate: new Date('2024-02-01'),
      isActive: true,
    },
  });
  console.log('✅ Created: Priyanka Sonkher (Tech Lead / Manager)');

  // ─── 4. Create Asst Tech Lead (Manager) ─────────────────────────────
  const saikat = await prisma.user.upsert({
    where: { email: 'saikat@antigravity.in' },
    update: {},
    create: {
      email: 'saikat@antigravity.in',
      password: hash,
      name: 'Saikat Ganguly',
      role: 'MANAGER',
      department: 'Technology',
      designation: 'Asst Tech Lead',
      phone: '+91-9876543213',
      workLocation: 'Kolkata HQ',
      managerId: priyanka.id,
      joinDate: new Date('2024-03-01'),
      isActive: true,
    },
  });
  console.log('✅ Created: Saikat Ganguly (Asst Tech Lead / Manager)');

  // ─── 5. Create Full Stack Developers (Employees) ────────────────────
  const archi = await prisma.user.upsert({
    where: { email: 'archi@antigravity.in' },
    update: {},
    create: {
      email: 'archi@antigravity.in',
      password: hash,
      name: 'Archi Jaiswal',
      role: 'EMPLOYEE',
      department: 'Technology',
      designation: 'Full Stack Developer',
      phone: '+91-9876543214',
      workLocation: 'Remote',
      managerId: priyanka.id,
      joinDate: new Date('2024-04-01'),
      isActive: true,
    },
  });
  console.log('✅ Created: Archi Jaiswal (Full Stack Developer)');

  const debsmit = await prisma.user.upsert({
    where: { email: 'debsmit@antigravity.in' },
    update: {},
    create: {
      email: 'debsmit@antigravity.in',
      password: hash,
      name: 'Debsmit Ghosh',
      role: 'EMPLOYEE',
      department: 'Technology',
      designation: 'Full Stack Developer',
      phone: '+91-9876543215',
      workLocation: 'Remote',
      managerId: priyanka.id,
      joinDate: new Date('2024-04-01'),
      isActive: true,
    },
  });
  console.log('✅ Created: Debsmit Ghosh (Full Stack Developer)');

  // ─── 6. Create Leave Balances for All Users ─────────────────────────
  const allUsers = [avik, shreyasi, priyanka, saikat, archi, debsmit];
  const leaveTypes = [
    { type: 'FULL_DAY', entitled: 18 },
    { type: 'HALF_DAY', entitled: 12 },
    { type: 'SICK_LEAVE', entitled: 12 },
    { type: 'EMERGENCY_LEAVE', entitled: 6 },
  ];

  for (const user of allUsers) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          userId_leaveType_year: {
            userId: user.id,
            leaveType: lt.type as any,
            year: new Date().getFullYear(),
          },
        },
        update: {},
        create: {
          userId: user.id,
          leaveType: lt.type as any,
          entitled: lt.entitled,
          taken: 0,
          pending: 0,
          remaining: lt.entitled,
          year: new Date().getFullYear(),
        },
      });
    }
  }
  console.log('✅ Created leave balances for all 6 users');

  // ─── 7. Create System Config Defaults ───────────────────────────────
  const configs = [
    { key: 'work_start_time', value: '09:00' },
    { key: 'work_end_time', value: '18:00' },
    { key: 'late_threshold', value: '09:30' },
    { key: 'min_hours', value: '4' },
    { key: 'leave_full_day', value: '18' },
    { key: 'leave_half_day', value: '12' },
    { key: 'leave_sick', value: '12' },
    { key: 'leave_emergency', value: '6' },
    { key: 'checkin_reminder_time', value: '10:00' },
    { key: 'leave_reset_month', value: '4' },
    { key: 'rating_label_1', value: 'Needs Improvement' },
    { key: 'rating_label_2', value: 'Below Average' },
    { key: 'rating_label_3', value: 'Meets Expectations' },
    { key: 'rating_label_4', value: 'Exceeds Expectations' },
    { key: 'rating_label_5', value: 'Outstanding' },
    { key: 'org_name', value: 'Antigravity' },
  ];

  for (const conf of configs) {
    await prisma.systemConfig.upsert({
      where: { key: conf.key },
      update: {},
      create: conf,
    });
  }
  console.log('✅ Created 16 system config defaults');

  // ─── 8. Welcome Notifications ───────────────────────────────────────
  for (const user of allUsers) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM_ALERT',
        title: 'Welcome to Workforce Tracker! 🎉',
        body: `Hi ${user.name.split(' ')[0]}, your account has been set up. Start by checking in for today.`,
        isRead: false,
      },
    });
  }
  console.log('✅ Created welcome notifications for all users');

  console.log('\n─────────────────────────────────────────────');
  console.log('🎉 Seed completed successfully!');
  console.log('─────────────────────────────────────────────');
  console.log('\n📋 Team Summary:');
  console.log('  Avik Das         → Founder (Super Admin)   → avik@antigravity.in');
  console.log('  Shreyasi M.      → Business Head (HR Admin) → shreyasi@antigravity.in');
  console.log('  Priyanka S.      → Tech Lead (Manager)     → priyanka@antigravity.in');
  console.log('  Saikat G.        → Asst Tech Lead (Manager) → saikat@antigravity.in');
  console.log('  Archi J.         → Full Stack Dev (Employee) → archi@antigravity.in');
  console.log('  Debsmit G.       → Full Stack Dev (Employee) → debsmit@antigravity.in');
  console.log('\n🔑 Default password for all: Welcome@123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
