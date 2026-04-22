import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authMiddleware, JwtPayload } from '../../lib/auth';

const router = Router();
router.use(authMiddleware);
const getUser = (req: Request): JwtPayload => (req as any).user;

// GET /api/activity?limit=30&page=1
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = getUser(req);
  const limit = Math.min(parseInt(String(req.query.limit || '30')), 100);
  const page = Math.max(parseInt(String(req.query.page || '1')), 1);
  try {
    const [items, total] = await Promise.all([
      (prisma as any).activityLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (prisma as any).activityLog.count({ where: { organizationId } }),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;

// Helper to log activity - call from other routers
export async function logActivity(params: {
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await (prisma as any).activityLog.create({
      data: {
        ...params,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch {
    // Non-critical - don't let logging failures break main flow
  }
}
