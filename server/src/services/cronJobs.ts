import cron from 'node-cron';
import prisma from '../utils/prisma';
import { startOfDay } from 'date-fns';

// ─── Auto Check-Out at Midnight ─────────────────────────────────────
// Runs every day at 11:59 PM IST (6:29 PM UTC)
export function scheduleAutoCheckout() {
  cron.schedule('29 18 * * *', async () => {
    console.log('⏰ Running auto-checkout job...');
    try {
      const today = startOfDay(new Date());
      const incomplete = await prisma.attendanceLog.findMany({
        where: { date: today, checkOut: null, checkIn: { not: null } },
      });

      for (const log of incomplete) {
        await prisma.attendanceLog.update({
          where: { id: log.id },
          data: {
            checkOut: new Date(),
            isComplete: false,
            endOfDayNote: 'Auto checked out at midnight (incomplete)',
            totalHours: log.checkIn ? Math.round(((new Date().getTime() - log.checkIn.getTime()) / 3600000) * 100) / 100 : 0,
          },
        });
      }

      console.log(`✅ Auto-checkout: ${incomplete.length} records updated`);
    } catch (error) {
      console.error('❌ Auto-checkout failed:', error);
    }
  }, { timezone: 'Asia/Kolkata' });
}

// ─── Check-In Reminder at 10:00 AM IST ──────────────────────────────
export function scheduleCheckinReminder() {
  cron.schedule('30 4 * * 1-6', async () => { // 4:30 AM UTC = 10:00 AM IST
    console.log('🔔 Running check-in reminder job...');
    try {
      const today = startOfDay(new Date());

      // Get active users who haven't checked in
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      const checkedIn = await prisma.attendanceLog.findMany({
        where: { date: today },
        select: { userId: true },
      });

      const checkedInIds = new Set(checkedIn.map(c => c.userId));
      const notCheckedIn = allUsers.filter(u => !checkedInIds.has(u.id));

      // Check if today is a holiday
      const holiday = await prisma.holiday.findUnique({ where: { date: today } });
      if (holiday) {
        console.log(`📅 Today is ${holiday.name} (holiday) — skipping reminders`);
        return;
      }

      for (const user of notCheckedIn) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'CHECK_IN_REMINDER',
            title: 'Check-In Reminder ⏰',
            body: `Hey ${user.name.split(' ')[0]}, you haven't checked in yet. Please check in now.`,
          },
        });
      }

      console.log(`✅ Reminded ${notCheckedIn.length} users to check in`);
    } catch (error) {
      console.error('❌ Check-in reminder failed:', error);
    }
  }, { timezone: 'Asia/Kolkata' });
}

// ─── Initialize All Cron Jobs ────────────────────────────────────────
export function initCronJobs() {
  scheduleAutoCheckout();
  scheduleCheckinReminder();
  console.log('📅 Cron jobs initialized (auto-checkout, check-in reminder)');
}
