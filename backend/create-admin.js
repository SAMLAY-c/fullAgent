const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // 检查是否已存在
    const existing = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (existing) {
      console.log('✅ Admin user already exists');
      console.log('   Username: admin');
      console.log('   Password: admin123 (or your previously set password)');
      return;
    }

    // 创建管理员账号
    const passwordHash = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
      data: {
        user_id: 'admin_001',
        username: 'admin',
        email: 'admin@bot-agent.local',
        password_hash: passwordHash,
        role: 'admin',
        avatar: null
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email:', admin.email);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
