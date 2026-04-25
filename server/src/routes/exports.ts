import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const router = Router();

/* ── helpers ──────────────────────────────────────────────────── */
const BRAND = 'Credovation Employee Management';
const BRAND_COLOR = '#0d9488';

function applyHeaderStyle(sheet: ExcelJS.Worksheet, headerRow: ExcelJS.Row) {
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0d9488' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  headerRow.eachCell(c => { c.style = headerStyle; });
}

/* ── Excel export ─────────────────────────────────────────────── */
router.post(
  '/:type',
  authenticate,
  authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
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
          const tc = sheet.getCell('A1');
          tc.value = `${BRAND} — Monthly Attendance Report (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
          tc.font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
          tc.alignment = { horizontal: 'center' };
          sheet.addRow([]);

          sheet.columns = [
            { key: 'name', width: 22 }, { key: 'dept', width: 15 },
            { key: 'date', width: 14 }, { key: 'status', width: 14 },
            { key: 'checkIn', width: 12 }, { key: 'checkOut', width: 12 },
            { key: 'hours', width: 10 }, { key: 'late', width: 8 },
            { key: 'rating', width: 8 },
          ];

          const hr = sheet.addRow(['Employee', 'Department', 'Date', 'Status', 'Check In', 'Check Out', 'Hours', 'Late', 'Rating']);
          applyHeaderStyle(sheet, hr);

          const where: any = { date: { gte: start, lte: end } };
          if (req.user!.role === 'MANAGER') {
            const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } });
            where.userId = { in: reports.map(r => r.id) };
          }
          const logs = await prisma.attendanceLog.findMany({
            where,
            include: { user: { select: { name: true, department: true } } },
            orderBy: [{ date: 'asc' }, { userId: 'asc' }],
          });
          logs.forEach(log => {
            const row = sheet.addRow({
              name: log.user.name, dept: log.user.department || '—',
              date: format(log.date, 'yyyy-MM-dd'), status: log.status,
              checkIn: log.checkIn ? format(log.checkIn, 'hh:mm a') : '—',
              checkOut: log.checkOut ? format(log.checkOut, 'hh:mm a') : '—',
              hours: log.totalHours?.toFixed(1) || '—',
              late: log.lateFlag ? 'Yes' : 'No',
              rating: log.selfRating || '—',
            });
            if (log.lateFlag) {
              row.getCell('late').font = { color: { argb: 'FFdc2626' }, bold: true };
            }
          });
          break;
        }

        case 'tasks': {
          const sheet = workbook.addWorksheet('Task Report');
          sheet.mergeCells('A1:F1');
          sheet.getCell('A1').value = `Task Completion Report (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
          sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
          sheet.addRow([]);
          sheet.columns = [
            { key: 'title', width: 30 }, { key: 'employee', width: 20 },
            { key: 'priority', width: 10 }, { key: 'status', width: 14 },
            { key: 'dueDate', width: 14 }, { key: 'assignedBy', width: 20 },
          ];
          const hr = sheet.addRow(['Task', 'Employee', 'Priority', 'Status', 'Due Date', 'Assigned By']);
          applyHeaderStyle(sheet, hr);

          const tasks = await prisma.task.findMany({
            where: { dueDate: { gte: start, lte: end } },
            include: {
              assignedTo: { select: { name: true } },
              assignedBy: { select: { name: true } },
            },
            orderBy: { dueDate: 'asc' },
          });
          tasks.forEach(t => {
            sheet.addRow({
              title: t.title, employee: t.assignedTo.name,
              priority: t.priority, status: t.status.replace('_', ' '),
              dueDate: format(t.dueDate, 'yyyy-MM-dd'), assignedBy: t.assignedBy.name,
            });
          });
          break;
        }

        case 'performance': {
          const sheet = workbook.addWorksheet('Performance');
          sheet.mergeCells('A1:F1');
          sheet.getCell('A1').value = `Performance Summary (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
          sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
          sheet.addRow([]);
          sheet.columns = [
            { key: 'name', width: 22 }, { key: 'dept', width: 15 },
            { key: 'avgRating', width: 12 }, { key: 'daysRated', width: 12 },
            { key: 'min', width: 8 }, { key: 'max', width: 8 },
          ];
          const hr = sheet.addRow(['Employee', 'Department', 'Avg Rating', 'Days Rated', 'Min', 'Max']);
          applyHeaderStyle(sheet, hr);

          const data = await prisma.attendanceLog.groupBy({
            by: ['userId'],
            where: { date: { gte: start, lte: end }, selfRating: { not: null } },
            _avg: { selfRating: true }, _count: { id: true },
            _min: { selfRating: true }, _max: { selfRating: true },
          });
          const userIds = data.map(d => d.userId);
          const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, department: true } });
          data.forEach(d => {
            const u = users.find(u => u.id === d.userId);
            sheet.addRow({
              name: u?.name, dept: u?.department || '—',
              avgRating: (d._avg?.selfRating || 0).toFixed(1),
              daysRated: d._count?.id || 0,
              min: d._min?.selfRating || '—', max: d._max?.selfRating || '—',
            });
          });
          break;
        }

        case 'leave': {
          const sheet = workbook.addWorksheet('Leave Report');
          sheet.mergeCells('A1:F1');
          sheet.getCell('A1').value = `Leave Report (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
          sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
          sheet.addRow([]);
          sheet.columns = [
            { key: 'name', width: 22 }, { key: 'type', width: 16 },
            { key: 'from', width: 14 }, { key: 'to', width: 14 },
            { key: 'status', width: 14 }, { key: 'approver', width: 20 },
          ];
          const hr = sheet.addRow(['Employee', 'Type', 'From', 'To', 'Status', 'Approver']);
          applyHeaderStyle(sheet, hr);

          const leaves = await prisma.leaveRequest.findMany({
            where: { OR: [{ startDate: { gte: start, lte: end } }, { endDate: { gte: start, lte: end } }] },
            include: {
              user: { select: { name: true } },
              approver: { select: { name: true } },
            },
            orderBy: { startDate: 'asc' },
          });
          leaves.forEach(l => {
            sheet.addRow({
              name: l.user.name, type: l.leaveType.replace(/_/g, ' '),
              from: format(l.startDate, 'yyyy-MM-dd'), to: format(l.endDate, 'yyyy-MM-dd'),
              status: l.status, approver: l.approver?.name || '—',
            });
          });
          break;
        }

        case 'late-arrivals': {
          const sheet = workbook.addWorksheet('Late Arrivals');
          sheet.mergeCells('A1:D1');
          sheet.getCell('A1').value = `Late Arrival Report (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
          sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0d9488' } };
          sheet.addRow([]);
          sheet.columns = [
            { key: 'name', width: 22 }, { key: 'dept', width: 15 },
            { key: 'date', width: 14 }, { key: 'checkIn', width: 14 },
          ];
          const hr = sheet.addRow(['Employee', 'Department', 'Date', 'Check In']);
          applyHeaderStyle(sheet, hr);

          const logs = await prisma.attendanceLog.findMany({
            where: { date: { gte: start, lte: end }, lateFlag: true },
            include: { user: { select: { name: true, department: true } } },
            orderBy: { date: 'asc' },
          });
          logs.forEach(l => {
            sheet.addRow({
              name: l.user.name, dept: l.user.department || '—',
              date: format(l.date, 'yyyy-MM-dd'),
              checkIn: l.checkIn ? format(l.checkIn, 'hh:mm a') : '—',
            });
          });
          break;
        }

        default:
          res.status(400).json({ error: 'Invalid report type' });
          return;
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${format(start, 'yyyy-MM-dd')}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  }
);

/* ── PDF export ───────────────────────────────────────────────── */
router.post(
  '/:type/pdf',
  authenticate,
  authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const { startDate, endDate } = req.body;

      const start = startDate ? startOfDay(parseISO(startDate)) : startOfMonth(new Date());
      const end = endDate ? endOfDay(parseISO(endDate)) : endOfMonth(new Date());
      const dateLabel = `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;

      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${format(start, 'yyyy-MM-dd')}.pdf`);
      doc.pipe(res);

      /* ── Brand header ─── */
      doc.rect(0, 0, 595.28, 70).fill('#0d9488');
      doc.fontSize(18).fillColor('#ffffff').font('Helvetica-Bold')
        .text(BRAND, 40, 18, { align: 'left' });
      doc.fontSize(10).fillColor('rgba(255,255,255,0.8)').font('Helvetica')
        .text(`Generated ${format(new Date(), 'PPpp')}`, 40, 42, { align: 'left' });
      doc.moveDown(2);

      /* ── Report title ─── */
      const reportTitles: Record<string, string> = {
        attendance: 'Monthly Attendance Report',
        tasks: 'Task Completion Report',
        performance: 'Performance Summary',
        leave: 'Leave Report',
        'late-arrivals': 'Late Arrival Report',
      };

      const reportType = type as string;
      doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold')
        .text(reportTitles[reportType] || reportType, 40, 85);
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text(dateLabel, 40);
      doc.moveDown(1);

      /* ── Helper: draw table ─── */
      const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
        const startX = 40;
        let y = doc.y;
        const rowHeight = 20;
        const pageBottom = 780;

        // Header
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#f1f5f9');
        let x = startX;
        headers.forEach((h, i) => {
          doc.fontSize(8).fillColor('#475569').font('Helvetica-Bold')
            .text(h, x + 4, y + 5, { width: colWidths[i] - 8, align: 'left' });
          x += colWidths[i];
        });
        y += rowHeight;

        // Rows
        rows.forEach((row, rowIdx) => {
          if (y + rowHeight > pageBottom) {
            doc.addPage();
            y = 40;
            // Re-draw header on new page
            doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#f1f5f9');
            let hx = startX;
            headers.forEach((h, i) => {
              doc.fontSize(8).fillColor('#475569').font('Helvetica-Bold')
                .text(h, hx + 4, y + 5, { width: colWidths[i] - 8, align: 'left' });
              hx += colWidths[i];
            });
            y += rowHeight;
          }

          if (rowIdx % 2 === 1) {
            doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#fafbfc');
          }
          x = startX;
          row.forEach((cell, i) => {
            doc.fontSize(8).fillColor('#334155').font('Helvetica')
              .text(cell || '—', x + 4, y + 5, { width: colWidths[i] - 8, align: 'left' });
            x += colWidths[i];
          });
          y += rowHeight;
        });

        doc.y = y + 10;
      };

      /* ── Data fetching & table rendering ─── */
      switch (type) {
        case 'attendance': {
          const where: any = { date: { gte: start, lte: end } };
          if (req.user!.role === 'MANAGER') {
            const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } });
            where.userId = { in: reports.map(r => r.id) };
          }
          const logs = await prisma.attendanceLog.findMany({
            where,
            include: { user: { select: { name: true, department: true } } },
            orderBy: [{ date: 'asc' }, { userId: 'asc' }],
          });
          drawTable(
            ['Employee', 'Department', 'Date', 'Status', 'Check In', 'Check Out', 'Hours', 'Late', 'Rating'],
            logs.map(l => [
              l.user.name, l.user.department || '—', format(l.date, 'yyyy-MM-dd'),
              l.status, l.checkIn ? format(l.checkIn, 'hh:mm a') : '—',
              l.checkOut ? format(l.checkOut, 'hh:mm a') : '—',
              l.totalHours?.toFixed(1) || '—', l.lateFlag ? 'Yes' : 'No',
              l.selfRating?.toString() || '—',
            ]),
            [72, 60, 58, 52, 52, 52, 40, 34, 34],
          );
          break;
        }

        case 'tasks': {
          const tasks = await prisma.task.findMany({
            where: { dueDate: { gte: start, lte: end } },
            include: { assignedTo: { select: { name: true } }, assignedBy: { select: { name: true } } },
            orderBy: { dueDate: 'asc' },
          });
          drawTable(
            ['Task', 'Employee', 'Priority', 'Status', 'Due Date', 'Assigned By'],
            tasks.map(t => [
              t.title, t.assignedTo.name, t.priority,
              t.status.replace('_', ' '), format(t.dueDate, 'yyyy-MM-dd'), t.assignedBy.name,
            ]),
            [120, 80, 50, 65, 65, 80],
          );
          break;
        }

        case 'performance': {
          const data = await prisma.attendanceLog.groupBy({
            by: ['userId'],
            where: { date: { gte: start, lte: end }, selfRating: { not: null } },
            _avg: { selfRating: true }, _count: { id: true },
            _min: { selfRating: true }, _max: { selfRating: true },
          });
          const userIds = data.map(d => d.userId);
          const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, department: true } });
          drawTable(
            ['Employee', 'Department', 'Avg Rating', 'Days Rated', 'Min', 'Max'],
            data.map(d => {
              const u = users.find(u => u.id === d.userId);
              return [
                u?.name || '—', u?.department || '—',
                (d._avg?.selfRating || 0).toFixed(1),
                (d._count?.id || 0).toString(),
                d._min?.selfRating?.toString() || '—',
                d._max?.selfRating?.toString() || '—',
              ];
            }),
            [100, 80, 70, 70, 50, 50],
          );
          break;
        }

        case 'leave': {
          const leaves = await prisma.leaveRequest.findMany({
            where: { OR: [{ startDate: { gte: start, lte: end } }, { endDate: { gte: start, lte: end } }] },
            include: { user: { select: { name: true } }, approver: { select: { name: true } } },
            orderBy: { startDate: 'asc' },
          });
          drawTable(
            ['Employee', 'Type', 'From', 'To', 'Status', 'Approver'],
            leaves.map(l => [
              l.user.name, l.leaveType.replace(/_/g, ' '),
              format(l.startDate, 'yyyy-MM-dd'), format(l.endDate, 'yyyy-MM-dd'),
              l.status, l.approver?.name || '—',
            ]),
            [90, 70, 70, 70, 65, 80],
          );
          break;
        }

        case 'late-arrivals': {
          const logs = await prisma.attendanceLog.findMany({
            where: { date: { gte: start, lte: end }, lateFlag: true },
            include: { user: { select: { name: true, department: true } } },
            orderBy: { date: 'asc' },
          });
          drawTable(
            ['Employee', 'Department', 'Date', 'Check In'],
            logs.map(l => [
              l.user.name, l.user.department || '—',
              format(l.date, 'yyyy-MM-dd'),
              l.checkIn ? format(l.checkIn, 'hh:mm a') : '—',
            ]),
            [140, 100, 90, 90],
          );
          break;
        }

        default:
          doc.text('Invalid report type');
      }

      /* ── Footer on every page ─── */
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
          .text(
            `${BRAND} • Page ${i + 1} of ${pages.count} • Confidential`,
            40, 810, { align: 'center', width: 515 }
          );
      }

      doc.end();
    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  }
);

export default router;
