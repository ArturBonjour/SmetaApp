import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authMiddleware, JwtPayload } from '../../lib/auth';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const router = Router();
router.use(authMiddleware);
const getUser = (req: Request): JwtPayload => (req as any).user;

// GET /api/estimation/:projectId
router.get('/:projectId', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId as string, organizationId },
      select: { currentVersionId: true },
    });
    if (!project || !project.currentVersionId) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const estimation = await prisma.estimation.findUnique({
      where: { projectVersionId: project.currentVersionId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json(estimation);
  } catch {
    res.status(500).json({ error: 'Failed to fetch estimation' });
  }
});

// PUT /api/estimation/:projectId/adjust
router.put('/:projectId/adjust', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const { discount, markup, notes } = req.body;
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId as string, organizationId },
      select: { currentVersionId: true },
    });
    if (!project?.currentVersionId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const est = await prisma.estimation.findUnique({ where: { projectVersionId: project.currentVersionId } });
    if (!est) {
      res.status(404).json({ error: 'Estimation not found' });
      return;
    }
    const updated = await prisma.estimation.update({
      where: { id: est.id },
      data: {
        ...(discount !== undefined && { discount: parseFloat(discount) }),
        ...(markup !== undefined && { markup: parseFloat(markup) }),
        ...(notes !== undefined && { notes }),
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to adjust estimation' });
  }
});

// GET /api/estimation/:projectId/export/excel
router.get('/:projectId/export/excel', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId as string, organizationId },
    });
    if (!project?.currentVersionId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const estimation = await prisma.estimation.findUnique({
      where: { projectVersionId: project.currentVersionId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!estimation) {
      res.status(404).json({ error: 'Estimation not found' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmetaApp';
    const sheet = workbook.addWorksheet('Смета');

    // Title
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = `Смета: ${project.name}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = `Дата: ${new Date().toLocaleDateString('ru-RU')}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Header
    const headerRow = sheet.addRow(['№', 'Наименование', 'Раздел', 'Ед. изм.', 'Количество', 'Цена, ₽', 'Сумма, ₽']);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    const unitLabels: Record<string, string> = { m2: 'м²', ml: 'м.п.', m3: 'м³', pcs: 'шт', hour: 'ч' };
    const catLabels: Record<string, string> = {
      wall: 'Стены', floor: 'Полы', roof: 'Кровля', window: 'Окна',
      door: 'Двери', foundation: 'Фундамент', engineering: 'Инженерия', finishing: 'Отделка', other: 'Прочее',
    };

    estimation.items.forEach((item, idx) => {
      const row = sheet.addRow([
        idx + 1,
        item.name,
        catLabels[item.category] || item.category,
        unitLabels[item.unit] || item.unit,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
      ]);
      if (idx % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        });
      }
    });

    // Totals
    const baseTotal = estimation.totalAmount;
    const markupAmt = baseTotal * (estimation.markup / 100);
    const discountAmt = baseTotal * (estimation.discount / 100);
    const finalTotal = baseTotal + markupAmt - discountAmt;

    sheet.addRow([]);
    const totalRow = sheet.addRow(['', '', '', '', '', 'Итого:', baseTotal]);
    totalRow.getCell(7).numFmt = '#,##0.00 ₽';
    totalRow.font = { bold: true };

    if (estimation.markup > 0) {
      const markupRow = sheet.addRow(['', '', '', '', '', `Наценка (${estimation.markup}%):`, markupAmt]);
      markupRow.getCell(7).numFmt = '#,##0.00 ₽';
    }
    if (estimation.discount > 0) {
      const discRow = sheet.addRow(['', '', '', '', '', `Скидка (${estimation.discount}%):`, -discountAmt]);
      discRow.getCell(7).numFmt = '#,##0.00 ₽';
    }
    const finalRow = sheet.addRow(['', '', '', '', '', 'ИТОГО К ОПЛАТЕ:', finalTotal]);
    finalRow.getCell(7).numFmt = '#,##0.00 ₽';
    finalRow.font = { bold: true, size: 12 };
    finalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    finalRow.getCell(6).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    finalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    finalRow.getCell(7).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };

    // Column widths
    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 35;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 10;
    sheet.getColumn(5).width = 12;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 18;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="smeta-${project.name}.xlsx"`);
    await workbook.xlsx.write(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/estimation/:projectId/export/pdf
router.get('/:projectId/export/pdf', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId as string, organizationId },
    });
    if (!project?.currentVersionId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const estimation = await prisma.estimation.findUnique({
      where: { projectVersionId: project.currentVersionId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!estimation) {
      res.status(404).json({ error: 'Estimation not found' });
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Смета: ${project.name}`, 14, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 14, 30);
    if (project.description) {
      doc.text(`Описание: ${project.description}`, 14, 37);
    }

    const unitLabels: Record<string, string> = { m2: 'м²', ml: 'м.п.', m3: 'м³', pcs: 'шт', hour: 'ч' };
    const catLabels: Record<string, string> = {
      wall: 'Стены', floor: 'Полы', roof: 'Кровля', window: 'Окна',
      door: 'Двери', foundation: 'Фундамент', engineering: 'Инженерия', finishing: 'Отделка', other: 'Прочее',
    };

    const tableData = estimation.items.map((item, idx) => [
      String(idx + 1),
      item.name,
      catLabels[item.category] || item.category,
      unitLabels[item.unit] || item.unit,
      item.quantity.toFixed(2),
      `${item.unitPrice.toLocaleString('ru-RU')} ₽`,
      `${item.totalPrice.toLocaleString('ru-RU')} ₽`,
    ]);

    const baseTotal = estimation.totalAmount;
    const markupAmt = baseTotal * (estimation.markup / 100);
    const discountAmt = baseTotal * (estimation.discount / 100);
    const finalTotal = baseTotal + markupAmt - discountAmt;

    autoTable(doc, {
      startY: 42,
      head: [['№', 'Наименование', 'Раздел', 'Ед.', 'Кол.', 'Цена', 'Сумма']],
      body: tableData,
      foot: [
        ['', '', '', '', '', 'Итого:', `${baseTotal.toLocaleString('ru-RU')} ₽`],
        ...(estimation.markup > 0 ? [['', '', '', '', '', `Наценка ${estimation.markup}%:`, `${markupAmt.toLocaleString('ru-RU')} ₽`]] : []),
        ...(estimation.discount > 0 ? [['', '', '', '', '', `Скидка ${estimation.discount}%:`, `-${discountAmt.toLocaleString('ru-RU')} ₽`]] : []),
        ['', '', '', '', '', 'ИТОГО:', `${finalTotal.toLocaleString('ru-RU')} ₽`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [21, 101, 192] as [number, number, number], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240] as [number, number, number], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 60 },
        2: { cellWidth: 22 },
        3: { cellWidth: 12 },
        4: { cellWidth: 14 },
        5: { cellWidth: 28 },
        6: { cellWidth: 28 },
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="smeta-${project.name}.pdf"`);
    res.send(Buffer.from(doc.output('arraybuffer')));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF export failed' });
  }
});

export default router;
