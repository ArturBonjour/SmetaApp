import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma/schema.prisma'),
  migrate: {
    adapter: async () => {
      const { PrismaLibSQL } = await import('@prisma/adapter-libsql');
      const { createClient } = await import('@libsql/client');
      const client = createClient({
        url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
      });
      return new PrismaLibSQL(client);
    },
  },
});
