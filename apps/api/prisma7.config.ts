// Prisma CLI configuration (migrate, generate). The runtime client gets its URL from
// PrismaService instead, so this file is only used by the CLI.
import { defineConfig } from 'prisma/config';

// Load apps/api/.env when present (host dev). In Docker the variables come from Compose.
try {
  process.loadEnvFile('.env');
} catch {
  // no .env file: rely on the real environment
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Optional for `prisma generate` (Docker build); required for migrate commands.
    url: process.env['DATABASE_URL'],
  },
});
