import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import ExcelJS from 'exceljs';

const BRAND = 'Credovation Employee Management';

function applyHeaderStyle(sheet: ExcelJS.Worksheet, headerRow: ExcelJS.Row) {
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0d9488' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
  };
  headerRow.eachCell(c => { c.style = headerStyle; });
}

export default apiHandler({
  POST: async (req: RouteRequest, res: NextApiResponse) => {
    const { type } = req.query;
    const { startDate, endDate } = req.body;
    const start = startDate ? startOfDay(parseISO(startDate)) : startOfMonth(new Date());
    const end = endDate ? endOfDay(parseISO(endDate)) : endOfMonth(new Date());

    const workbook = new ExcelJS.Workbook();
    workbook.creator = BRAND;
    workbook.created = new Date();

    switch (type) {
      case 'attendance': {
        const sheet = workbook.addWorksheet('Attendance Report');
        sheet.mergeCells('A1:I1');
        sheet.getCell('A1').value = `${BRAND} — Monthly Attendance Report (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
        sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
        sheet.addRow([]);
        sheet.columns = [{ key: 'name', width: 22 }, { key: 'dept', width: 15 }, { key: 'date', width: 14 }, { key: 'status', width: 14 }, { key: 'checkIn', width: 12 }, { key: 'checkOut', width: 12 }, { key: 'hours', width: 10 }, { key: 'late', width: 8 }, { key: 'rating', width: 8 }];
        const hr = sheet.addRow(['Employee', 'Department', 'Date', 'Status', 'Check In', 'Check Out', 'Hours', 'Late', 'Rating']);
        applyHeaderStyle(sheet, hr);
        const where: any = { date: { gte: start, lte: end } };
        if (req.user!.role === 'MANAGER') { const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } }); where.userId = { in: reports.map(r => r.id) }; }
        const logs = await prisma.attendanceLog.findMany({ where, include: { user: { select: { name: true, department: true } } }, orderBy: [{ date: 'asc' }, { userId: 'asc' }] });
        logs.forEach(log => {
          const row = sheet.addRow({ name: log.user.name, dept: log.user.department || '—', date: format(log.date, 'yyyy-MM-dd'), status: log.status, checkIn: log.checkIn ? format(log.checkIn, 'hh:mm a') : '—', checkOut: log.checkOut ? format(log.checkOut, 'hh:mm a') : '—', hours: log.totalHours?.toFixed(1) || '—', late: log.lateFlag ? 'Yes' : 'No', rating: log.selfRating || '—' });
          if (log.lateFlag) row.getCell('late').font = { color: { argb: 'FFdc2626' }, bold: true };
        });
        break;
      }
      case 'tasks': {
        const sheet = workbook.addWorksheet('Task Report');
        sheet.mergeCells('A1:F1');
        sheet.getCell('A1').value = `Task Completion Report (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
        sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
        sheet.addRow([]);
        sheet.columns = [{ key: 'title', width: 30 }, { key: 'employee', width: 20 }, { key: 'priority', width: 10 }, { key: 'status', width: 14 }, { key: 'dueDate', width: 14 }, { key: 'assignedBy', width: 20 }];
        const hr = sheet.addRow(['Task', 'Employee', 'Priority', 'Status', 'Due Date', 'Assigned By']);
        applyHeaderStyle(sheet, hr);
        const tasks = await prisma.task.findMany({ where: { dueDate: { gte: start, lte: end } }, include: { assignedTo: { select: { name: true } }, assignedBy: { select: { name: true } } }, orderBy: { dueDate: 'asc' } });
        tasks.forEach(t => { sheet.addRow({ title: t.title, employee: t.assignedTo.name, priority: t.priority, status: t.status.replace('_', ' '), dueDate: format(t.dueDate, 'yyyy-MM-dd'), assignedBy: t.assignedBy.name }); });
        break;
      }
      case 'performance': {
        const sheet = workbook.addWorksheet('Performance');
        sheet.mergeCells('A1:F1');
        sheet.getCell('A1').value = `Performance Summary (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
        sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
        sheet.addRow([]);
        sheet.columns = [{ key: 'name', width: 22 }, { key: 'dept', width: 15 }, { key: 'avgRating', width: 12 }, { key: 'daysRated', width: 12 }, { key: 'min', width: 8 }, { key: 'max', width: 8 }];
        const hr = sheet.addRow(['Employee', 'Department', 'Avg Rating', 'Days Rated', 'Min', 'Max']);
        applyHeaderStyle(sheet, hr);
        const data = await prisma.attendanceLog.groupBy({ by: ['userId'], where: { date: { gte: start, lte: end }, selfRating: { not: null } }, _avg: { selfRating: true }, _count: { id: true }, _min: { selfRating: true }, _max: { selfRating: true } });
        const userIds = data.map(d => d.userId);
        const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, department: true } });
        data.forEach(d => { const u = users.find(u => u.id === d.userId); sheet.addRow({ name: u?.name, dept: u?.department || '—', avgRating: (d._avg?.selfRating || 0).toFixed(1), daysRated: d._count?.id || 0, min: d._min?.selfRating || '—', max: d._max?.selfRating || '—' }); });
        break;
      }
      case 'leave': {
        const sheet = workbook.addWorksheet('Leave Report');
        sheet.mergeCells('A1:F1');
        sheet.getCell('A1').value = `Leave Report (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
        sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
        sheet.addRow([]);
        sheet.columns = [{ key: 'name', width: 22 }, { key: 'type', width: 16 }, { key: 'from', width: 14 }, { key: 'to', width: 14 }, { key: 'status', width: 14 }, { key: 'approver', width: 20 }];
        const hr = sheet.addRow(['Employee', 'Type', 'From', 'To', 'Status', 'Approver']);
        applyHeaderStyle(sheet, hr);
        const leaves = await prisma.leaveRequest.findMany({ where: { OR: [{ startDate: { gte: start, lte: end } }, { endDate: { gte: start, lte: end } }] }, include: { user: { select: { name: true } }, approver: { select: { name: true } } }, orderBy: { startDate: 'asc' } });
        leaves.forEach(l => { sheet.addRow({ name: l.user.name, type: l.leaveType.replace(/_/g, ' '), from: format(l.startDate, 'yyyy-MM-dd'), to: format(l.endDate, 'yyyy-MM-dd'), status: l.status, approver: l.approver?.name || '—' }); });
        break;
      }
      default: return res.status(400).json({ error: 'Invalid report type' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${format(start, 'yyyy-MM-dd')}.xlsx`);
    await workbook.xlsx.write(res as any);
    res.end();
  },
}, { roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] });
