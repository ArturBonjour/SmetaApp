import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authMiddleware, JwtPayload } from '../../lib/auth';

const router = Router();
router.use(authMiddleware);

const getUser = (req: Request): JwtPayload => (req as any).user;
const pid = (req: Request): string => pid(req) as string;

// GET /api/projects
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const projects = await prisma.project.findMany({
      where: { organizationId },
      include: {
        currentVersion: { select: { id: true, version: true, label: true, createdAt: true } },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const { name, description, templateId } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name required' });
    return;
  }
  try {
    let geometryJson = JSON.stringify({ elements: [], width: 10, height: 8 });
    if (templateId) {
      const tpl = await prisma.projectTemplate.findUnique({ where: { id: templateId } });
      if (tpl) geometryJson = tpl.geometryJson;
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        organizationId,
        templateId,
        versions: {
          create: {
            version: 1,
            label: 'Начальная версия',
            geometryJson,
          },
        },
      },
      include: { versions: true },
    });
    // set current version
    const ver = project.versions[0];
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { currentVersionId: ver.id },
      include: { currentVersion: true },
    });
    // create empty estimation
    await prisma.estimation.create({
      data: { projectVersionId: ver.id, items: { create: [] } },
    });
    res.status(201).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const project = await prisma.project.findFirst({
      where: { id: pid(req), organizationId },
      include: {
        currentVersion: {
          include: {
            estimations: {
              include: { items: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
        versions: { select: { id: true, version: true, label: true, createdAt: true }, orderBy: { version: 'desc' } },
      },
    });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const { name, description, status } = req.body;
  try {
    const project = await prisma.project.findFirst({ where: { id: pid(req), organizationId } });
    if (!project) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const updated = await prisma.project.update({
      where: { id: pid(req) },
      data: { ...(name && { name }), ...(description !== undefined && { description }), ...(status && { status }) },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const project = await prisma.project.findFirst({ where: { id: pid(req), organizationId } });
    if (!project) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await prisma.project.delete({ where: { id: pid(req) } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// PUT /api/projects/:id/geometry  — save geometry + recalculate
router.put('/:id/geometry', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const { geometryJson, createNewVersion } = req.body;
  if (!geometryJson) {
    res.status(400).json({ error: 'geometryJson required' });
    return;
  }
  try {
    const project = await prisma.project.findFirst({
      where: { id: pid(req), organizationId },
      include: { currentVersion: true },
    });
    if (!project || !project.currentVersion) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    let versionId = project.currentVersion.id;

    if (createNewVersion) {
      const count = await prisma.projectVersion.count({ where: { projectId: project.id } });
      const newVer = await prisma.projectVersion.create({
        data: {
          projectId: project.id,
          version: count + 1,
          label: `Версия ${count + 1}`,
          geometryJson,
        },
      });
      await prisma.project.update({ where: { id: project.id }, data: { currentVersionId: newVer.id } });
      await prisma.estimation.create({ data: { projectVersionId: newVer.id } });
      versionId = newVer.id;
    } else {
      await prisma.projectVersion.update({
        where: { id: versionId },
        data: { geometryJson },
      });
    }

    // Recalculate estimation
    const estimation = await recalculateEstimation(versionId, geometryJson);
    res.json({ versionId, estimation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save geometry' });
  }
});

// GET /api/projects/templates/list
router.get('/templates/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.projectTemplate.findMany({ orderBy: { name: 'asc' } });
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

async function recalculateEstimation(versionId: string, geometryJson: string) {
  const geometry = JSON.parse(geometryJson);
  const elements: any[] = geometry.elements || [];
  const catalogItems = await prisma.catalogItem.findMany({ where: { isSystem: true } });
  const catalogMap = new Map(catalogItems.map((c) => [c.category + ':' + c.name, c]));

  const lineItems: Array<{
    name: string;
    category: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    formula: string;
    geometryRef: string;
    catalogItemId: string | null;
    sortOrder: number;
  }> = [];

  let sortOrder = 0;

  for (const el of elements) {
    const items = computeElementItems(el, catalogItems);
    for (const item of items) {
      lineItems.push({ ...item, sortOrder: sortOrder++ });
    }
  }

  const total = lineItems.reduce((s, i) => s + i.totalPrice, 0);

  // Upsert estimation
  const existing = await prisma.estimation.findUnique({ where: { projectVersionId: versionId } });
  let estimation;
  if (existing) {
    await prisma.estimationItem.deleteMany({ where: { estimationId: existing.id } });
    estimation = await prisma.estimation.update({
      where: { id: existing.id },
      data: {
        totalAmount: total,
        items: { create: lineItems },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  } else {
    estimation = await prisma.estimation.create({
      data: {
        projectVersionId: versionId,
        totalAmount: total,
        items: { create: lineItems },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }
  return estimation;
}

function computeElementItems(el: any, catalog: any[]) {
  const items: any[] = [];
  const byCategory = (cat: string) => catalog.filter((c) => c.category === cat);

  if (el.type === 'wall') {
    const length = el.length || 0; // meters
    const height = el.height || 2.5;
    const area = parseFloat((length * height).toFixed(2));
    const wallMat = catalog.find((c) => c.category === 'wall' && c.name.toLowerCase().includes('брус'));
    if (wallMat && area > 0) {
      items.push({
        name: `Стена: ${wallMat.name}`,
        category: 'wall',
        unit: 'm2',
        quantity: area,
        unitPrice: wallMat.unitPrice,
        totalPrice: parseFloat((area * wallMat.unitPrice).toFixed(2)),
        formula: `${length}м × ${height}м = ${area}м²`,
        geometryRef: el.id,
        catalogItemId: wallMat.id,
      });
    }
  } else if (el.type === 'floor') {
    const area = parseFloat(((el.width || 0) * (el.depth || 0)).toFixed(2));
    const floorMat = catalog.find((c) => c.category === 'floor');
    if (floorMat && area > 0) {
      items.push({
        name: `Пол: ${floorMat.name}`,
        category: 'floor',
        unit: 'm2',
        quantity: area,
        unitPrice: floorMat.unitPrice,
        totalPrice: parseFloat((area * floorMat.unitPrice).toFixed(2)),
        formula: `${el.width}м × ${el.depth}м = ${area}м²`,
        geometryRef: el.id,
        catalogItemId: floorMat.id,
      });
    }
  } else if (el.type === 'roof') {
    const area = parseFloat(((el.width || 0) * (el.depth || 0) * 1.15).toFixed(2)); // 15% slope factor
    const roofMat = catalog.find((c) => c.category === 'roof');
    if (roofMat && area > 0) {
      items.push({
        name: `Кровля: ${roofMat.name}`,
        category: 'roof',
        unit: 'm2',
        quantity: area,
        unitPrice: roofMat.unitPrice,
        totalPrice: parseFloat((area * roofMat.unitPrice).toFixed(2)),
        formula: `${el.width}м × ${el.depth}м × 1.15 (уклон) = ${area}м²`,
        geometryRef: el.id,
        catalogItemId: roofMat.id,
      });
    }
  } else if (el.type === 'window') {
    const winMat = catalog.find((c) => c.category === 'window');
    if (winMat) {
      items.push({
        name: `Окно: ${winMat.name}`,
        category: 'window',
        unit: 'pcs',
        quantity: 1,
        unitPrice: winMat.unitPrice,
        totalPrice: winMat.unitPrice,
        formula: `1 шт × ${winMat.unitPrice}₽`,
        geometryRef: el.id,
        catalogItemId: winMat.id,
      });
    }
  } else if (el.type === 'door') {
    const doorMat = catalog.find((c) => c.category === 'door');
    if (doorMat) {
      items.push({
        name: `Дверь: ${doorMat.name}`,
        category: 'door',
        unit: 'pcs',
        quantity: 1,
        unitPrice: doorMat.unitPrice,
        totalPrice: doorMat.unitPrice,
        formula: `1 шт × ${doorMat.unitPrice}₽`,
        geometryRef: el.id,
        catalogItemId: doorMat.id,
      });
    }
  } else if (el.type === 'foundation') {
    const area = parseFloat(((el.width || 0) * (el.depth || 0)).toFixed(2));
    const foundMat = catalog.find((c) => c.category === 'foundation');
    if (foundMat && area > 0) {
      items.push({
        name: `Фундамент: ${foundMat.name}`,
        category: 'foundation',
        unit: 'm2',
        quantity: area,
        unitPrice: foundMat.unitPrice,
        totalPrice: parseFloat((area * foundMat.unitPrice).toFixed(2)),
        formula: `${el.width}м × ${el.depth}м = ${area}м²`,
        geometryRef: el.id,
        catalogItemId: foundMat.id,
      });
    }
  }

  return items;
}

export { recalculateEstimation };
export default router;
