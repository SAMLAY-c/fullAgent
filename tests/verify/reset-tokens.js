/**
 * 重置 Refresh Tokens 表
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetTokens() {
  console.log('正在清空 refresh_tokens 表...');
  await prisma.refreshToken.deleteMany({});
  console.log('✅ refresh_tokens 表已清空');
  await prisma.$disconnect();
}

resetTokens().catch(console.error);
