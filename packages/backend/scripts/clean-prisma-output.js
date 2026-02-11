/**
 * Removes the generated Prisma client directory before prisma generate.
 * Prevents EPERM (operation not permitted) on rename on Windows when the
 * directory is locked by another process or antivirus.
 */
import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Prisma generates to repo root node_modules/.prisma/client (see schema.prisma output)
const prismaOutput = join(__dirname, '..', '..', '..', 'node_modules', '.prisma');

if (existsSync(prismaOutput)) {
  try {
    rmSync(prismaOutput, { recursive: true, force: true });
  } catch (_err) {
    // Ignore; prisma generate may still succeed
  }
}
