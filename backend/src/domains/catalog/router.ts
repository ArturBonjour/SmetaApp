import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authMiddleware, JwtPayload } from '../../lib/auth';

const router = Router();
router.use(authMiddleware);

const getUser = (req: Request): JwtPayload => (req as any).user;

// GET /api/catalog
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const { category } = req.query;
  try {
    const items = await prisma.catalogItem.findMany({
      where: {
        OR: [{ isSystem: true }, { organizationId }],
        ...(category ? { category: String(category) } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

// POST /api/catalog
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const { name, category, unit, unitPrice, description } = req.body;
  if (!name || !category || !unit || unitPrice === undefined) {
    res.status(400).json({ error: 'name, category, unit, unitPrice required' });
    return;
  }
  try {
    const item = await prisma.catalogItem.create({
      data: { name, category, unit, unitPrice: parseFloat(unitPrice), description, organizationId, isSystem: false },
    });
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'Failed to create catalog item' });
  }
});

// PUT /api/catalog/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const { name, category, unit, unitPrice, description } = req.body;
  try {
    const existing = await prisma.catalogItem.findFirst({
      where: { id: req.params.id as string, organizationId, isSystem: false },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found or cannot edit system item' });
      return;
    }
    const item = await prisma.catalogItem.update({
      where: { id: req.params.id as string },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(unit && { unit }),
        ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
        ...(description !== undefined && { description }),
      },
    });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/catalog/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  try {
    const existing = await prisma.catalogItem.findFirst({
      where: { id: req.params.id as string, organizationId, isSystem: false },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found or cannot delete system item' });
      return;
    }
    await prisma.catalogItem.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
