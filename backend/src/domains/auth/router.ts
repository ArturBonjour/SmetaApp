import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { signToken } from '../../lib/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, organizationName } = req.body;
  if (!email || !password || !name || !organizationName) {
    res.status(400).json({ error: 'All fields required' });
    return;
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const org = await prisma.organization.create({ data: { name: organizationName } });
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: 'admin', organizationId: org.id },
    });
    const token = signToken({ userId: user.id, organizationId: org.id, role: user.role, name: user.name });
    res.status(201).json({ token, user: { id: user.id, email, name, role: user.role, organizationId: org.id } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken({ userId: user.id, organizationId: user.organizationId, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId } });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/demo - create/login demo account
router.post('/demo', async (_req: Request, res: Response): Promise<void> => {
  const demoEmail = 'demo@smeta.app';
  try {
    let user = await prisma.user.findUnique({ where: { email: demoEmail } });
    if (!user) {
      const org = await prisma.organization.create({ data: { name: 'Демо Компания' } });
      user = await prisma.user.create({
        data: {
          email: demoEmail,
          passwordHash: await bcrypt.hash('demo123', 10),
          name: 'Демо Пользователь',
          role: 'admin',
          organizationId: org.id,
        },
      });
    }
    const token = signToken({ userId: user.id, organizationId: user.organizationId, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId } });
  } catch {
    res.status(500).json({ error: 'Demo login failed' });
  }
});

export default router;
