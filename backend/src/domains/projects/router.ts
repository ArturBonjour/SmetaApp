import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authMiddleware, JwtPayload } from '../../lib/auth';
import { logActivity } from '../activity/router';

const router = Router();
router.use(authMiddleware);

const getUser = (req: Request): JwtPayload => (req as any).user;
const pid = (req: Request): string => req.params.id as string;

// GET /api/projects/templates/list  — MUST be before /:id
router.get('/templates/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.projectTemplate.findMany({ orderBy: { name: 'asc' } });
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/projects/stats  — aggregate stats for the org
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const projects = await prisma.project.findMany({
      where: { organizationId },
      select: { id: true, status: true, currentVersionId: true },
    });
    const versionIds = projects.map((p) => p.currentVersionId).filter(Boolean) as string[];
    const estimations = await prisma.estimation.findMany({
      where: { projectVersionId: { in: versionIds } },
      select: { totalAmount: true, discount: true, markup: true },
    });
    const totalAmount = estimations.reduce((sum, e) => {
      const base = e.totalAmount;
      const final = base + base * (e.markup / 100) - base * (e.discount / 100);
      return sum + final;
    }, 0);
    const byStatus = projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    res.json({
      total: projects.length,
      totalAmount: Math.round(totalAmount),
      byStatus: {
        draft: byStatus.draft || 0,
        active: byStatus.active || 0,
        completed: byStatus.completed || 0,
        archived: byStatus.archived || 0,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

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
    // Enrich with estimation totals
    const versionIds = projects.map((p) => p.currentVersion?.id).filter(Boolean) as string[];
    const estimations = await prisma.estimation.findMany({
      where: { projectVersionId: { in: versionIds } },
      select: { projectVersionId: true, totalAmount: true, discount: true, markup: true },
    });
    const estMap = new Map(estimations.map((e) => [e.projectVersionId, e]));
    const enriched = projects.map((p) => {
      const est = p.currentVersion ? estMap.get(p.currentVersion.id) : undefined;
      const base = est?.totalAmount || 0;
      const finalAmount = est ? base + base * (est.markup / 100) - base * (est.discount / 100) : 0;
      return { ...p, estimationTotal: Math.round(finalAmount) };
    });
    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req);
  const { organizationId } = user;
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
          create: { version: 1, label: 'Начальная версия', geometryJson },
        },
      },
      include: { versions: true },
    });
    const ver = project.versions[0];
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { currentVersionId: ver.id },
      include: { currentVersion: true },
    });
    await prisma.estimation.create({ data: { projectVersionId: ver.id, items: { create: [] } } });
    await logActivity({ organizationId, userId: user.userId, userName: user.name, action: 'project.create', entityType: 'project', entityId: project.id, entityName: name });
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
          include: { estimations: { include: { items: { orderBy: { sortOrder: 'asc' } } } } },
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
  const user = getUser(req);
  const { organizationId } = user;
  const { name, description, status } = req.body;
  try {
    const project = await prisma.project.findFirst({ where: { id: pid(req), organizationId } });
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    const updated = await prisma.project.update({
      where: { id: pid(req) },
      data: { ...(name && { name }), ...(description !== undefined && { description }), ...(status && { status }) },
    });
    if (status && status !== project.status) {
      await logActivity({ organizationId, userId: user.userId, userName: user.name, action: 'project.status', entityType: 'project', entityId: project.id, entityName: project.name, metadata: { from: project.status, to: status } });
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req);
  const { organizationId } = user;
  try {
    const project = await prisma.project.findFirst({ where: { id: pid(req), organizationId } });
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.project.delete({ where: { id: pid(req) } });
    await logActivity({ organizationId, userId: user.userId, userName: user.name, action: 'project.delete', entityType: 'project', entityId: project.id, entityName: project.name });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// POST /api/projects/:id/duplicate
router.post('/:id/duplicate', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const project = await prisma.project.findFirst({
      where: { id: pid(req), organizationId },
      include: { currentVersion: true },
    });
    if (!project || !project.currentVersion) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const copy = await prisma.project.create({
      data: {
        name: `${project.name} (копия)`,
        description: project.description,
        organizationId,
        templateId: project.templateId,
        versions: {
          create: {
            version: 1,
            label: 'Начальная версия',
            geometryJson: project.currentVersion.geometryJson,
          },
        },
      },
      include: { versions: true },
    });
    const ver = copy.versions[0];
    const updated = await prisma.project.update({
      where: { id: copy.id },
      data: { currentVersionId: ver.id },
      include: { currentVersion: true },
    });
    // recalculate estimation for the copy
    await recalculateEstimation(ver.id, project.currentVersion.geometryJson);
    res.status(201).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to duplicate project' });
  }
});

// PUT /api/projects/:id/geometry  — save geometry + recalculate
router.put('/:id/geometry', async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req);
  const { organizationId } = user;
  const { geometryJson, createNewVersion } = req.body;
  if (!geometryJson) { res.status(400).json({ error: 'geometryJson required' }); return; }
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
        data: { projectId: project.id, version: count + 1, label: `Версия ${count + 1}`, geometryJson },
      });
      await prisma.project.update({ where: { id: project.id }, data: { currentVersionId: newVer.id } });
      await prisma.estimation.create({ data: { projectVersionId: newVer.id } });
      versionId = newVer.id;
      await logActivity({ organizationId, userId: user.userId, userName: user.name, action: 'project.version', entityType: 'project', entityId: project.id, entityName: project.name, metadata: { version: count + 1 } });
    } else {
      await prisma.projectVersion.update({ where: { id: versionId }, data: { geometryJson } });
    }

    // update project updatedAt
    await prisma.project.update({ where: { id: project.id }, data: { updatedAt: new Date() } });

    const estimation = await recalculateEstimation(versionId, geometryJson);
    res.json({ versionId, estimation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save geometry' });
  }
});

// GET /api/projects/:id/versions — list all versions
router.get('/:id/versions', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const project = await prisma.project.findFirst({ where: { id: pid(req), organizationId } });
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    const versions = await prisma.projectVersion.findMany({
      where: { projectId: pid(req) },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, label: true, createdAt: true },
    });
    res.json(versions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// PUT /api/projects/:id/versions/:versionId/label — rename version
router.put('/:id/versions/:versionId/label', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const { label } = req.body;
  try {
    const project = await prisma.project.findFirst({ where: { id: pid(req), organizationId } });
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    const ver = await prisma.projectVersion.update({
      where: { id: req.params.versionId as string },
      data: { label },
    });
    res.json(ver);
  } catch {
    res.status(500).json({ error: 'Failed to update label' });
  }
});

// POST /api/projects/:id/versions/:versionId/restore — switch current version
router.post('/:id/versions/:versionId/restore', async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req);
  const { organizationId } = user;
  try {
    const project = await prisma.project.findFirst({ where: { id: pid(req), organizationId } });
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    const ver = await prisma.projectVersion.findFirst({ where: { id: req.params.versionId as string, projectId: pid(req) } });
    if (!ver) { res.status(404).json({ error: 'Version not found' }); return; }
    const updated = await prisma.project.update({
      where: { id: pid(req) },
      data: { currentVersionId: ver.id },
      include: { currentVersion: true },
    });
    await logActivity({ organizationId, userId: user.userId, userName: user.name, action: 'project.restore', entityType: 'project', entityId: project.id, entityName: project.name, metadata: { version: ver.version } });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

async function recalculateEstimation(versionId: string, geometryJson: string) {
  const geometry = JSON.parse(geometryJson);
  const elements: any[] = geometry.elements || [];
  const catalogItems = await prisma.catalogItem.findMany({ where: { isSystem: true } });

  const lineItems: Array<{
    name: string; category: string; unit: string; quantity: number;
    unitPrice: number; totalPrice: number; formula: string;
    geometryRef: string; catalogItemId: string | null; sortOrder: number;
  }> = [];

  let sortOrder = 0;
  for (const el of elements) {
    const items = computeElementItems(el, catalogItems);
    for (const item of items) {
      lineItems.push({ ...item, sortOrder: sortOrder++ });
    }
  }

  const total = lineItems.reduce((s, i) => s + i.totalPrice, 0);
  const existing = await prisma.estimation.findUnique({ where: { projectVersionId: versionId } });

  let estimation;
  if (existing) {
    await prisma.estimationItem.deleteMany({ where: { estimationId: existing.id } });
    estimation = await prisma.estimation.update({
      where: { id: existing.id },
      data: { totalAmount: total, items: { create: lineItems } },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  } else {
    estimation = await prisma.estimation.create({
      data: { projectVersionId: versionId, totalAmount: total, items: { create: lineItems } },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }
  return estimation;
}

function computeElementItems(el: any, catalog: any[]) {
  const items: any[] = [];

  if (el.type === 'wall') {
    const length = el.length || 0;
    const height = el.height || 2.5;
    const area = parseFloat((length * height).toFixed(2));
    const mat = el.catalogItemId
      ? catalog.find((c) => c.id === el.catalogItemId)
      : catalog.find((c) => c.category === 'wall' && c.name.toLowerCase().includes('брус'));
    if (mat && area > 0) {
      items.push({
        name: `Стена: ${mat.name}`, category: 'wall', unit: 'm2', quantity: area,
        unitPrice: mat.unitPrice, totalPrice: parseFloat((area * mat.unitPrice).toFixed(2)),
        formula: `${length}м × ${height}м = ${area}м²`, geometryRef: el.id, catalogItemId: mat.id,
      });
    }
  } else if (el.type === 'floor') {
    const area = parseFloat(((el.width || 0) * (el.depth || 0)).toFixed(2));
    const mat = el.catalogItemId
      ? catalog.find((c) => c.id === el.catalogItemId)
      : catalog.find((c) => c.category === 'floor');
    if (mat && area > 0) {
      items.push({
        name: `Пол: ${mat.name}`, category: 'floor', unit: 'm2', quantity: area,
        unitPrice: mat.unitPrice, totalPrice: parseFloat((area * mat.unitPrice).toFixed(2)),
        formula: `${el.width}м × ${el.depth}м = ${area}м²`, geometryRef: el.id, catalogItemId: mat.id,
      });
    }
  } else if (el.type === 'roof') {
    const area = parseFloat(((el.width || 0) * (el.depth || 0) * 1.15).toFixed(2));
    const mat = el.catalogItemId
      ? catalog.find((c) => c.id === el.catalogItemId)
      : catalog.find((c) => c.category === 'roof');
    if (mat && area > 0) {
      items.push({
        name: `Кровля: ${mat.name}`, category: 'roof', unit: 'm2', quantity: area,
        unitPrice: mat.unitPrice, totalPrice: parseFloat((area * mat.unitPrice).toFixed(2)),
        formula: `${el.width}м × ${el.depth}м × 1.15 (уклон) = ${area}м²`, geometryRef: el.id, catalogItemId: mat.id,
      });
    }
  } else if (el.type === 'window') {
    const mat = el.catalogItemId
      ? catalog.find((c) => c.id === el.catalogItemId)
      : catalog.find((c) => c.category === 'window');
    if (mat) {
      items.push({
        name: `Окно: ${mat.name}`, category: 'window', unit: 'pcs', quantity: 1,
        unitPrice: mat.unitPrice, totalPrice: mat.unitPrice,
        formula: `1 шт × ${mat.unitPrice}₽`, geometryRef: el.id, catalogItemId: mat.id,
      });
    }
  } else if (el.type === 'door') {
    const mat = el.catalogItemId
      ? catalog.find((c) => c.id === el.catalogItemId)
      : catalog.find((c) => c.category === 'door');
    if (mat) {
      items.push({
        name: `Дверь: ${mat.name}`, category: 'door', unit: 'pcs', quantity: 1,
        unitPrice: mat.unitPrice, totalPrice: mat.unitPrice,
        formula: `1 шт × ${mat.unitPrice}₽`, geometryRef: el.id, catalogItemId: mat.id,
      });
    }
  } else if (el.type === 'foundation') {
    const area = parseFloat(((el.width || 0) * (el.depth || 0)).toFixed(2));
    const mat = el.catalogItemId
      ? catalog.find((c) => c.id === el.catalogItemId)
      : catalog.find((c) => c.category === 'foundation');
    if (mat && area > 0) {
      items.push({
        name: `Фундамент: ${mat.name}`, category: 'foundation', unit: 'm2', quantity: area,
        unitPrice: mat.unitPrice, totalPrice: parseFloat((area * mat.unitPrice).toFixed(2)),
        formula: `${el.width}м × ${el.depth}м = ${area}м²`, geometryRef: el.id, catalogItemId: mat.id,
      });
    }
  }

  return items;
}

export default router;
