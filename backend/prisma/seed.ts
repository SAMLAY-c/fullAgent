import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding baseline data...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      user_id: 'user_admin_001',
      username: 'admin',
      email: 'admin@example.com',
      password_hash: adminPassword,
      role: 'admin',
      avatar: '👤'
    }
  });

  console.log(`Admin ready: ${admin.username}`);
  console.log('Seed complete. Business data (bots/topics/messages) should be created via frontend + API.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
